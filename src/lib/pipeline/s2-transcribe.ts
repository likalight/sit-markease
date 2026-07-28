import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { ReadASchema, ReadBSchema, type ReadA, type ReadB } from "@/lib/schemas/transcription";
import { readANativeSchema, readBNativeSchema } from "./native-schemas";
import { s2ReadASystemPrompt, s2ReadAUserPrompt, s2ReadBSystemPrompt, s2ReadBUserPrompt, PROMPT_VERSIONS } from "./prompts";
import { reconcile } from "./reconcile";

// §7.3/§7.4 — S2 dual-read + S3 reconcile. Read A runs on the `primary` role
// (Gemini by default), Read B on the `fast` role (Groq by default) — two
// different providers, not just two models (docs/DECISIONS.md "M2 —
// free-tier providers").

export async function readA(imageBase64: string, lineCount: number, submissionId: string): Promise<ReadA> {
  return callStructured({
    stage: "S2_read_a",
    promptVersion: PROMPT_VERSIONS.s2ReadA,
    role: "primary",
    system: s2ReadASystemPrompt(),
    prompt: s2ReadAUserPrompt(lineCount),
    images: [{ mimeType: "image/png", base64: imageBase64 }],
    schema: ReadASchema,
    nativeSchema: readANativeSchema,
    temperature: 0,
    submissionId,
  });
}

export async function readB(imageBase64: string, lineCount: number, submissionId: string): Promise<ReadB> {
  return callStructured({
    stage: "S2_read_b",
    promptVersion: PROMPT_VERSIONS.s2ReadB,
    role: "fast",
    system: s2ReadBSystemPrompt(),
    prompt: s2ReadBUserPrompt(lineCount),
    images: [{ mimeType: "image/png", base64: imageBase64 }],
    schema: ReadBSchema,
    temperature: 0,
    submissionId,
  });
}

export interface TranscribeResult {
  status: "ready_for_review" | "needs_human_review" | "needs_human_transcription" | "failed";
  transcriptionId?: string;
}

/** Runs S2 (dual-read) + S3 (reconcile) for a submission that already has a
 * processed page + detected lines (from M1's S1/S1b). Persists the
 * transcription + solution_steps, and updates the submission's status.
 * Degrades rather than throws (CLAUDE.md rule 8) — on failure the submission
 * is marked 'failed' and a stage_runs row records why. */
export async function transcribeSubmission(submissionId: string): Promise<TranscribeResult> {
  // Idempotency guard: re-running this on a submission that already has a
  // transcription must not create a second row — Supabase's .maybeSingle()
  // correctly errors on 2+ matches (the local JSON store silently didn't,
  // which is how this went unnoticed until real duplicate rows surfaced in
  // Supabase). Callers that want a fresh re-transcription should delete the
  // existing row first, not rely on this function to do it implicitly.
  const existing = await db.getTranscription(submissionId);
  if (existing) {
    const submission = await db.getSubmission(submissionId);
    return { status: (submission?.status as TranscribeResult["status"]) ?? "ready_for_review", transcriptionId: (existing as any).id };
  }

  const pages = await db.listSubmissionPages(submissionId);
  const page = pages[0];
  if (!page) {
    await db.logStageRun({ submissionId, stage: "S2_transcribe", status: "failed", error: "no submission_pages found" });
    await db.updateSubmission(submissionId, { status: "failed" });
    return { status: "failed" };
  }

  const lines = await db.listDetectedLines(page.id);
  const lineCount = lines.length;

  let processedBytes: Buffer;
  try {
    processedBytes = await db.downloadImage(page.processed_path);
  } catch (err) {
    await db.logStageRun({
      submissionId,
      stage: "S2_transcribe",
      status: "failed",
      error: `could not load processed image: ${err instanceof Error ? err.message : String(err)}`,
    });
    await db.updateSubmission(submissionId, { status: "failed" });
    return { status: "failed" };
  }
  const imageBase64 = processedBytes.toString("base64");

  let a: ReadA;
  let b: ReadB;
  try {
    [a, b] = await Promise.all([
      readA(imageBase64, lineCount, submissionId),
      readB(imageBase64, lineCount, submissionId),
    ]);
  } catch (err) {
    // Documented fallback (CLAUDE.md rule 8 / rule 2): either read failing
    // halts at needs_human_transcription rather than crashing the pipeline.
    await db.logStageRun({
      submissionId,
      stage: "S2_transcribe",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    await db.updateSubmission(submissionId, { status: "needs_human_transcription" });
    return { status: "needs_human_transcription" };
  }

  const reconciled = await reconcile(a, b, Number(process.env.AIMS_AGREEMENT_THRESHOLD ?? 0.85));

  const finalAnswerLatex = b.final_answer.present ? b.final_answer.latex : null;

  const transcription = await db.createTranscription({
    submission_id: submissionId,
    read_a_raw: a,
    read_b_raw: b,
    transcription_agreement: reconciled.transcription_agreement,
    overall_legibility: a.overall_legibility,
    final_answer_latex: finalAnswerLatex,
    flags: b.flags,
    reconciliation_notes: `routing=${reconciled.routing}`,
    model_a: "primary",
    model_b: "fast",
    prompt_version: PROMPT_VERSIONS.s2ReadA,
  });

  await db.insertSolutionSteps(
    reconciled.steps.map((s) => ({
      transcription_id: transcription.id,
      step_index: s.step_index,
      line_indices: s.line_indices,
      latex: s.latex,
      plain_text: s.plain_text,
      role: s.role,
      box: null,
      confidence: s.confidence,
      agreement: s.agreement,
      source: s.source,
      edited_by_human: false,
    }))
  );

  await db.logStageRun({
    submissionId,
    stage: "S3_reconcile",
    status: "succeeded",
    promptVersion: "deterministic",
  });

  const status =
    reconciled.routing === "reconciled"
      ? "ready_for_review"
      : reconciled.routing === "needs_human_review"
        ? "ready_for_review" // proceeds per §7.4, but flagged via needs_human_review on the eventual grade
        : "needs_human_transcription";

  await db.updateSubmission(submissionId, { status });

  return { status: reconciled.routing === "needs_human_review" ? "needs_human_review" : status, transcriptionId: transcription.id };
}
