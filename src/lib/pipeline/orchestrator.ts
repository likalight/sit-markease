import { db } from "@/lib/db/facade";
import { transcribeSubmission, type TranscribeResult } from "./s2-transcribe";
import { transcribeTypedSubmission } from "./s2-transcribe-typed";
import { assessSubmission } from "./s4-assess";
import { diagnoseSubmission } from "./s5-diagnose";
import { generateFeedback } from "./s6-feedback";

// Runs S2->S6 in order (transcribe, assess, diagnose, feedback). CLAUDE.md
// rule 3: nothing writes final_grades without an explicit educator approval
// action — every result, confident or not, lands in the review queue
// (getReviewQueue() filters to "no final_grade yet") and waits for a real
// approve action (POST /api/submissions/:id/approve). This function used to
// also auto-release confident results with approved_by: null, which
// directly violated rule 3 — removed (docs/DECISIONS.md).
//
// S7 (practice generation) no longer runs automatically here either — it's
// now a student-triggered action (POST /api/submissions/:id/request-revision,
// see s7-practice.ts), matching the pitch deck's "student sees gap &
// requests revision" step rather than practice sets appearing unasked.
//
// Shared by both entry points below — a photo submission and a typed
// submission only differ in how S2 produces its transcription; S4 onward
// has no idea which path a submission came through.
async function continuePipelineAfterTranscription(submissionId: string, transcribeResult: TranscribeResult) {
  if (transcribeResult.status === "needs_human_transcription" || transcribeResult.status === "failed") {
    return { ...transcribeResult, assess: { status: "failed" }, diagnose: { status: "failed" }, feedback: { status: "failed" } };
  }

  const assessResult = await assessSubmission(submissionId);
  const diagnoseResult = assessResult.status === "assessed" ? await diagnoseSubmission(submissionId) : { status: "failed" as const, detectedCount: 0 };

  let preferredTone: "supportive" | "concise" | "socratic" = "supportive";
  if (assessResult.status === "assessed") {
    const submission = await db.getSubmission(submissionId);
    const student = submission?.student_id ? await db.getUser(submission.student_id) : null;
    preferredTone = (student as any)?.feedback_tone ?? "supportive";
  }
  const feedbackResult = assessResult.status === "assessed" ? await generateFeedback(submissionId, preferredTone) : { status: "failed" as const };

  return { ...transcribeResult, assess: assessResult, diagnose: diagnoseResult, feedback: feedbackResult };
}

export async function runFullPipeline(submissionId: string) {
  const transcribeResult = await transcribeSubmission(submissionId);
  return continuePipelineAfterTranscription(submissionId, transcribeResult);
}

// Objective 1 (brief) — the typed-input entry point: a student submits
// their solution as text/LaTeX steps instead of a photo, skipping S1/S2's
// OCR path (see s2-transcribe-typed.ts), then rejoins the same S4-S7 flow.
export async function runFullPipelineForTypedInput(submissionId: string, rawLatexSteps: string[]) {
  const transcribeResult = await transcribeTypedSubmission(submissionId, rawLatexSteps);
  return continuePipelineAfterTranscription(submissionId, transcribeResult);
}
