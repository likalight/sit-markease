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

// Reintroduced auto-release, scoped to formative/ai-mode assessments only
// (Nicholas's review, docs/DECISIONS.md; 'ai' added alongside it — same
// no-human-in-the-loop release path, just a distinct mode value so it can
// be labeled/positioned separately, see src/lib/assessment-mode.ts): a
// weekly-practice question or a self-serve AI trainer is a different
// product from a graded assessment — the whole point is instant feedback
// with no human reviewer in the immediate loop. This is a deliberate,
// mode-gated exception, not a reversion of the summative-mode fix above;
// summative ('Evaluative') submissions are completely unaffected — that
// mode keeps the full instructor-approval gate CLAUDE.md rule 3 requires.
async function autoReleaseIfNoInstructorGate(submissionId: string): Promise<boolean> {
  const submission = await db.getSubmission(submissionId);
  if (!submission) return false;
  const question = await db.getQuestionWithRubric(submission.question_id);
  const assessment = question ? await db.getAssessment((question as any).assessment_id) : null;
  const mode = (assessment as any)?.assessment_mode;
  if (mode !== "formative" && mode !== "ai") return false;

  const grade = await db.getGradeRecommendation(submissionId);
  if (!grade) return false;

  await db.createFinalGrade({
    submission_id: submissionId,
    total: (grade as any).total_recommended,
    approved_by: null,
    approved_at: new Date().toISOString(),
    adjusted: false,
    adjustment_note:
      mode === "ai"
        ? "Auto-released — AI trainer mode, no instructor ever involved."
        : "Auto-released — developmental practice mode, no instructor gate.",
    review_seconds: 0,
  });
  await db.updateSubmission(submissionId, { status: "released" });
  return true;
}

async function continuePipelineAfterTranscription(submissionId: string, transcribeResult: TranscribeResult) {
  if (transcribeResult.status === "needs_human_transcription" || transcribeResult.status === "failed") {
    return {
      ...transcribeResult,
      assess: { status: "failed" },
      diagnose: { status: "failed" },
      feedback: { status: "failed" },
      autoReleased: false,
    };
  }

  const assessResult = await assessSubmission(submissionId);
  const diagnoseResult = assessResult.status === "assessed" ? await diagnoseSubmission(submissionId) : { status: "failed" as const, detectedCount: 0 };

  // How much of the answer S6 may reveal is an instructor decision, per
  // assessment, made before release — not a student personal preference
  // (users.feedback_tone, migration 0004, is now superseded by this for
  // the reveal-depth axis; see migration 0009). Applies uniformly to
  // formative and summative: formative used to be hardcoded to always
  // "socratic" here, which took the choice away from the instructor even
  // though formative is exactly where an instructor might reasonably want
  // guided or reveal instead (e.g. a low-stakes weekly quiz the class
  // won't revisit).
  let feedbackMode: "socratic" | "guided" | "reveal" = "guided";
  if (assessResult.status === "assessed") {
    const submission = await db.getSubmission(submissionId);
    const question = submission ? await db.getQuestionWithRubric(submission.question_id) : null;
    const assessment = question ? await db.getAssessment((question as any).assessment_id) : null;
    feedbackMode = (assessment as any)?.feedback_mode ?? "guided";
  }
  const feedbackResult = assessResult.status === "assessed" ? await generateFeedback(submissionId, feedbackMode) : { status: "failed" as const };

  // Threaded through to the API response so the client actually knows
  // release happened — this was silently dropped before (the function ran
  // and correctly wrote final_grades, but its result was never captured or
  // returned), so every formative submission's immediate on-screen response
  // showed the generic "needs educator check" banner regardless of whether
  // it had, in fact, already been released. Found live testing the
  // formative journey end to end.
  const autoReleased = feedbackResult.status === "generated" ? await autoReleaseIfNoInstructorGate(submissionId) : false;

  return { ...transcribeResult, assess: assessResult, diagnose: diagnoseResult, feedback: feedbackResult, autoReleased };
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
