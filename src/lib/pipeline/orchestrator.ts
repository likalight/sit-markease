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
// also auto-release every confident result with approved_by: null, which
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

// Reintroduced auto-release, scoped to formative-mode assessments only
// (Nicholas's review, docs/DECISIONS.md): a weekly-practice question is a
// different product from a graded assessment — the whole point is instant
// feedback with no human reviewer in the immediate loop. This is a
// deliberate, mode-gated exception, not a reversion of the summative-mode
// fix above; summative submissions are completely unaffected.
async function autoReleaseIfFormative(submissionId: string) {
  const submission = await db.getSubmission(submissionId);
  if (!submission) return;
  const question = await db.getQuestionWithRubric(submission.question_id);
  const assessment = question ? await db.getAssessment((question as any).assessment_id) : null;
  if ((assessment as any)?.assessment_mode !== "formative") return;

  const grade = await db.getGradeRecommendation(submissionId);
  if (!grade) return;

  await db.createFinalGrade({
    submission_id: submissionId,
    total: (grade as any).total_recommended,
    approved_by: null,
    approved_at: new Date().toISOString(),
    adjusted: false,
    adjustment_note: "Auto-released — formative practice mode, no instructor gate.",
    review_seconds: 0,
  });
  await db.updateSubmission(submissionId, { status: "released" });
}

async function continuePipelineAfterTranscription(submissionId: string, transcribeResult: TranscribeResult) {
  if (transcribeResult.status === "needs_human_transcription" || transcribeResult.status === "failed") {
    return { ...transcribeResult, assess: { status: "failed" }, diagnose: { status: "failed" }, feedback: { status: "failed" } };
  }

  const assessResult = await assessSubmission(submissionId);
  const diagnoseResult = assessResult.status === "assessed" ? await diagnoseSubmission(submissionId) : { status: "failed" as const, detectedCount: 0 };

  let preferredTone: "supportive" | "concise" | "socratic" = "supportive";
  if (assessResult.status === "assessed") {
    const submission = await db.getSubmission(submissionId);
    const question = submission ? await db.getQuestionWithRubric(submission.question_id) : null;
    const assessment = question ? await db.getAssessment((question as any).assessment_id) : null;
    if ((assessment as any)?.assessment_mode === "formative") {
      // Progressive hints, not a preference — the defining trait of
      // formative mode (Nicholas's review), so it overrides whatever tone
      // the student has set for themselves.
      preferredTone = "socratic";
    } else {
      const student = submission?.student_id ? await db.getUser(submission.student_id) : null;
      preferredTone = (student as any)?.feedback_tone ?? "supportive";
    }
  }
  const feedbackResult = assessResult.status === "assessed" ? await generateFeedback(submissionId, preferredTone) : { status: "failed" as const };

  if (feedbackResult.status === "generated") {
    await autoReleaseIfFormative(submissionId);
  }

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
