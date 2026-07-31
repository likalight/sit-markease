import { db } from "@/lib/db/facade";
import { transcribeSubmission, type TranscribeResult } from "./s2-transcribe";
import { transcribeTypedSubmission } from "./s2-transcribe-typed";
import { assessSubmission } from "./s4-assess";
import { diagnoseSubmission } from "./s5-diagnose";
import { generateFeedback } from "./s6-feedback";
import { generatePracticeSet } from "./s7-practice";

// Single place that runs S2->S7 in order, then auto-releases the grade the
// moment it's earned — a confident, agreeing, verified result needs no
// educator to touch it. Only a disputed/low-confidence result
// (grade_recommendation.needs_human_review) is left unapproved, which is
// exactly what puts it in the educator's queue (getReviewQueue() already
// filters to "no final_grade yet" — so this function is the only thing that
// needed to change to make "educator only sees the uncertain ones" true).
//
// Shared by both entry points below — a photo submission and a typed
// submission only differ in how S2 produces its transcription; S4 onward
// has no idea which path a submission came through.
async function continuePipelineAfterTranscription(submissionId: string, transcribeResult: TranscribeResult) {
  if (transcribeResult.status === "needs_human_transcription" || transcribeResult.status === "failed") {
    return { ...transcribeResult, assess: { status: "failed" }, diagnose: { status: "failed" }, feedback: { status: "failed" }, practice: { status: "failed" }, autoReleased: false };
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
  const practiceResult =
    diagnoseResult.status === "diagnosed" && diagnoseResult.detectedCount > 0
      ? await generatePracticeSet(submissionId)
      : { status: "failed" as const, itemCount: 0, discardedCount: 0 };

  let autoReleased = false;
  if (assessResult.status === "assessed") {
    const grade = await db.getGradeRecommendation(submissionId);
    if (grade && !(grade as any).needs_human_review) {
      await db.createFinalGrade({
        submission_id: submissionId,
        total: (grade as any).total_recommended,
        approved_by: null,
        approved_at: new Date().toISOString(),
        adjusted: false,
        adjustment_note: null,
        review_seconds: 0,
      });
      await db.insertAuditLog({
        actor_id: null,
        entity_type: "submission",
        entity_id: submissionId,
        action: "auto_release",
        before: null,
        after: { total: (grade as any).total_recommended },
      });
      await db.updateSubmission(submissionId, { status: "approved" });
      autoReleased = true;
    }
  }

  return { ...transcribeResult, assess: assessResult, diagnose: diagnoseResult, feedback: feedbackResult, practice: practiceResult, autoReleased };
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
