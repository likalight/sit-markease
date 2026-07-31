import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { TypedReadSchema } from "@/lib/schemas/transcription";
import { s2ReadTypedNativeSchema } from "./native-schemas";
import { s2ReadTypedSystemPrompt, s2ReadTypedUserPrompt, PROMPT_VERSIONS } from "./prompts";
import type { TranscribeResult } from "./s2-transcribe";

// Objective 1 (brief) — broaden input beyond OCR: a student who already has
// their solution in LaTeX shouldn't have to photograph handwriting and hope
// the read is right. Typed steps carry zero transcription risk, so this
// path skips S1 (line detection) and the vision read entirely — the only
// thing an AI call still does is name what operation each already-exact
// step performs, the one part S4's grading actually depends on.
export async function transcribeTypedSubmission(
  submissionId: string,
  rawLatexSteps: string[]
): Promise<TranscribeResult> {
  const existing = await db.getTranscription(submissionId);
  if (existing) {
    const submission = await db.getSubmission(submissionId);
    return { status: (submission?.status as TranscribeResult["status"]) ?? "ready_for_review", transcriptionId: (existing as any).id };
  }

  const steps = rawLatexSteps
    .map((latex, i) => ({ step_index: i + 1, latex: latex.trim() }))
    .filter((s) => s.latex.length > 0);

  if (steps.length === 0) {
    await db.logStageRun({ submissionId, stage: "S2_transcribe", status: "failed", error: "no typed steps submitted" });
    await db.updateSubmission(submissionId, { status: "failed" });
    return { status: "failed" };
  }

  let annotated;
  try {
    annotated = await callStructured({
      stage: "S2_transcribe",
      promptVersion: PROMPT_VERSIONS.s2ReadTyped,
      role: "primary",
      system: s2ReadTypedSystemPrompt(),
      prompt: s2ReadTypedUserPrompt(steps),
      schema: TypedReadSchema,
      nativeSchema: s2ReadTypedNativeSchema,
      temperature: 0,
      submissionId,
    });
  } catch (err) {
    await db.logStageRun({
      submissionId,
      stage: "S2_transcribe",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    await db.updateSubmission(submissionId, { status: "needs_human_transcription" });
    return { status: "needs_human_transcription" };
  }

  const annotationByIndex = new Map(annotated.steps.map((s) => [s.step_index, s]));

  const transcription = await db.createTranscription({
    submission_id: submissionId,
    read_a_raw: annotated,
    read_b_raw: null,
    transcription_agreement: 1,
    overall_legibility: 1,
    final_answer_latex: annotated.final_answer.present ? annotated.final_answer.latex : null,
    flags: [],
    reconciliation_notes: "routing=reconciled (typed input, no OCR risk)",
    model_a: "primary",
    model_b: null,
    prompt_version: PROMPT_VERSIONS.s2ReadTyped,
  });

  await db.insertSolutionSteps(
    steps.map((s) => {
      const a = annotationByIndex.get(s.step_index);
      return {
        transcription_id: transcription.id,
        step_index: s.step_index,
        line_indices: [],
        latex: s.latex,
        plain_text: a?.plain_text ?? "",
        role: a?.role ?? "setup",
        box: null,
        confidence: 1,
        agreement: 1,
        source: "typed",
        edited_by_human: false,
      };
    })
  );

  await db.logStageRun({ submissionId, stage: "S2_transcribe", status: "succeeded", promptVersion: PROMPT_VERSIONS.s2ReadTyped });
  await db.updateSubmission(submissionId, { status: "ready_for_review" });

  return { status: "ready_for_review", transcriptionId: transcription.id };
}
