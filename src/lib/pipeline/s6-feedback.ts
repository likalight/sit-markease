import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { FeedbackSchema } from "@/lib/schemas/feedback";
import { feedbackNativeSchema } from "./native-schemas";
import { s6FeedbackSystemPrompt, s6FeedbackUserPrompt, PROMPT_VERSIONS } from "./prompts";

// §7.7 S6 — feedback generation. Runs on the `primary` role.

export interface FeedbackResult {
  status: "generated" | "failed";
  feedbackId?: string;
}

/** Runs S6 for a diagnosed submission (M6/S5). Persists one feedback row.
 * Degrades rather than throws (CLAUDE.md rule 8). */
export async function generateFeedback(
  submissionId: string,
  tone: "supportive" | "concise" | "socratic" = "supportive"
): Promise<FeedbackResult> {
  // Idempotency guard — see s2-transcribe.ts's identical guard.
  const existingFeedback = await db.getFeedback(submissionId);
  if (existingFeedback) {
    return { status: "generated", feedbackId: (existingFeedback as any).id };
  }

  const submission = await db.getSubmission(submissionId);
  const transcription = submission ? await db.getTranscription(submissionId) : null;
  const grade = submission ? await db.getGradeRecommendation(submissionId) : null;
  if (!submission || !transcription || !grade) {
    await db.logStageRun({
      submissionId,
      stage: "S6_feedback",
      status: "failed",
      error: "missing transcription or grade recommendation",
    });
    return { status: "failed" };
  }

  const steps = await db.listSolutionSteps(transcription.id);
  const module_ = await db.getModuleForQuestion(submission.question_id);
  const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
  const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));
  const tags = await db.listMisconceptionTags(submissionId);

  const misconceptionsForPrompt = tags.map((t: any) => ({
    name: (taxonomyById.get(t.misconception_id) as any)?.name ?? "unnamed misconception",
    evidence_step_indices: t.evidence_step_indices,
    observed_signature: t.observed_signature,
  }));

  let feedback;
  try {
    feedback = await callStructured({
      stage: "S6_feedback",
      promptVersion: PROMPT_VERSIONS.s6Feedback,
      role: "primary",
      system: s6FeedbackSystemPrompt(),
      prompt: s6FeedbackUserPrompt({
        steps: steps.map((s: any) => ({ step_index: s.step_index, plain_text: s.plain_text })),
        totalScore: grade.total_recommended,
        maxScore: grade.max_total,
        misconceptions: misconceptionsForPrompt,
        tone,
      }),
      schema: FeedbackSchema,
      nativeSchema: feedbackNativeSchema,
      temperature: 0.5,
      submissionId,
    });
  } catch (err) {
    await db.logStageRun({
      submissionId,
      stage: "S6_feedback",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "failed" };
  }

  const feedbackRow = await db.createFeedback({
    submission_id: submissionId,
    summary: feedback.summary,
    strengths: feedback.strengths,
    breakdown_points: feedback.breakdown_points,
    next_action: feedback.next_action,
    tone: feedback.tone,
    edited_by_human: false,
    released_at: null,
  });

  await db.logStageRun({ submissionId, stage: "S6_feedback", status: "succeeded", promptVersion: PROMPT_VERSIONS.s6Feedback });

  return { status: "generated", feedbackId: (feedbackRow as any).id };
}
