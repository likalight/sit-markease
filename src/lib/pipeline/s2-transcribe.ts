import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { sidecar } from "@/lib/sidecar/client";
import { detectText, isConfigured as isTextractConfigured } from "@/lib/ocr/textract";
import { TranscriptionReadSchema, type TranscriptionRead } from "@/lib/schemas/transcription";
import { s2ReadNativeSchema } from "./native-schemas";
import { s2ReadSystemPrompt, s2ReadUserPrompt, pix2textHintSource, textractHintSource, renderOcrHints, type OcrHintSource, PROMPT_VERSIONS } from "./prompts";
import { assessRead } from "./reconcile";

// §7.3 — S2 single-read transcription. One multimodal LLM call does literal
// transcription + step segmentation in one pass (docs/DECISIONS.md — dropped
// the dual-vendor cross-read design; the official brief only calls for
// "multimodal LLMs" as a technology, not two independent AI reads that must
// agree). Runs on the `primary` role.

/** pix2text and Textract are pre-transcription hints, not a replacement for
 * the vision call — CLAUDE.md rule 5 keeps the image as the final
 * authority. Each is called independently and degrades on its own (sidecar
 * down, Textract not configured, either API erroring) — a missing or
 * failed source just means one fewer hint, never a failed transcription
 * (CLAUDE.md rule 8). Exported so scripts/seed-ai-fixtures.ts can build the
 * exact same hint a live call would. */
export async function gatherOcrHintSources(imageBase64: string): Promise<OcrHintSource[]> {
  const [pix2textResult, textractResult] = await Promise.allSettled([
    sidecar.ocrTranscribe(imageBase64),
    isTextractConfigured() ? detectText(imageBase64) : Promise.reject(new Error("Textract not configured")),
  ]);

  const sources: OcrHintSource[] = [];
  if (pix2textResult.status === "fulfilled" && pix2textResult.value.items.length > 0) {
    sources.push(pix2textHintSource(pix2textResult.value.items));
  }
  if (textractResult.status === "fulfilled" && textractResult.value.length > 0) {
    sources.push(textractHintSource(textractResult.value));
  }
  return sources;
}

export async function readTranscription(imageBase64: string, lineCount: number, submissionId: string): Promise<TranscriptionRead> {
  const sources = await gatherOcrHintSources(imageBase64);
  const ocrHint = sources.length > 0 ? renderOcrHints(sources) : undefined;

  return callStructured({
    stage: "S2_read",
    promptVersion: PROMPT_VERSIONS.s2Read,
    role: "primary",
    system: s2ReadSystemPrompt(),
    prompt: s2ReadUserPrompt(lineCount, ocrHint),
    images: [{ mimeType: "image/png", base64: imageBase64 }],
    schema: TranscriptionReadSchema,
    nativeSchema: s2ReadNativeSchema,
    temperature: 0,
    submissionId,
  });
}

export interface TranscribeResult {
  status: "ready_for_review" | "needs_human_review" | "needs_human_transcription" | "failed";
  transcriptionId?: string;
}

/** Runs S2 for a submission that already has a processed page + detected
 * lines (from M1's S1/S1b). Persists the transcription + solution_steps, and
 * updates the submission's status. Degrades rather than throws (CLAUDE.md
 * rule 8) — on failure the submission is marked 'failed' and a stage_runs
 * row records why. */
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

  let read: TranscriptionRead;
  try {
    read = await readTranscription(imageBase64, lineCount, submissionId);
  } catch (err) {
    // Documented fallback (CLAUDE.md rule 8 / rule 2): a failed read halts at
    // needs_human_transcription rather than crashing the pipeline.
    await db.logStageRun({
      submissionId,
      stage: "S2_transcribe",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    await db.updateSubmission(submissionId, { status: "needs_human_transcription" });
    return { status: "needs_human_transcription" };
  }

  const assessed = await assessRead(read, Number(process.env.AIMS_AGREEMENT_THRESHOLD ?? 0.85));

  const finalAnswerLatex = read.final_answer.present ? read.final_answer.latex : null;

  const transcription = await db.createTranscription({
    submission_id: submissionId,
    read_a_raw: read,
    read_b_raw: null,
    transcription_agreement: assessed.transcription_agreement,
    overall_legibility: read.overall_legibility,
    final_answer_latex: finalAnswerLatex,
    flags: read.flags,
    reconciliation_notes: `routing=${assessed.routing}`,
    model_a: "primary",
    model_b: null,
    prompt_version: PROMPT_VERSIONS.s2Read,
  });

  await db.insertSolutionSteps(
    assessed.steps.map((s) => ({
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
    stage: "S2_transcribe",
    status: "succeeded",
    promptVersion: PROMPT_VERSIONS.s2Read,
  });

  const status =
    assessed.routing === "reconciled"
      ? "ready_for_review"
      : assessed.routing === "needs_human_review"
        ? "ready_for_review" // proceeds per §7.4, but flagged via needs_human_review on the eventual grade
        : "needs_human_transcription";

  await db.updateSubmission(submissionId, { status });

  return { status: assessed.routing === "needs_human_review" ? "needs_human_review" : status, transcriptionId: transcription.id };
}
