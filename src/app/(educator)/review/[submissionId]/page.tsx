import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { getReviewQueueGroupedByQuestion } from "@/lib/pipeline/review-queue";
import { ReviewConsole } from "@/components/review-console";

// §11.1 E3 — the hero screen. Three panes: original image + line boxes |
// numbered steps | criterion cards with evidence chips. Approve writes
// final_grades + audit_log; keyboard model per docs/DESIGN.md §4;
// review_seconds timed client-side from mount to approve.
export default async function ReviewSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const { submissionId } = await params;

  const submission = await db.getSubmission(submissionId);
  if (!submission) notFound();

  const question = await db.getQuestionWithRubric(submission.question_id);
  const pages = await db.listSubmissionPages(submissionId);
  const page = pages[0];
  const boxes = page ? await db.listDetectedLines(page.id) : [];
  // Line boxes are computed by OpenCV against the deskewed/denoised image
  // (sidecar/cv.py preprocess), not the raw upload — deskewing rotates and
  // can resize the frame, so box percentages only line up against that same
  // processed image. Showing the original here silently misaligned every
  // box whenever a page had any real-world skew.
  const originalUrl = page ? await db.getImageUrl(page.processed_path ?? page.storage_path) : null;

  const transcription = await db.getTranscription(submissionId);
  const steps = transcription ? await db.listSolutionSteps(transcription.id) : [];

  const grade = await db.getGradeRecommendation(submissionId);
  const criteria = grade ? await db.listCriterionResults(grade.id) : [];
  const feedback = await db.getFeedback(submissionId);

  const module_ = await db.getModuleForQuestion(submission.question_id);
  const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
  const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));
  const misconceptionTags = await db.listMisconceptionTags(submissionId);
  const misconceptionStepIndices = new Set<number>(
    misconceptionTags.flatMap((t: any) => t.evidence_step_indices as number[])
  );

  // Gradescope-style: navigation stays within this question's own batch,
  // not the whole cross-question queue — an instructor works through one
  // rubric before switching to a different question.
  //
  // Two different batches, on purpose:
  // - The full, unfiltered list (every submission ever made to this
  //   question, oldest first) backs plain Previous/Next — this is the only
  //   way to browse back to something already approved, since approving a
  //   submission removes it from the review queue entirely.
  // - The review queue's ungraded-only grouping backs "next/previous
  //   ungraded" — approving flips the current submission's status, so
  //   "what's next to actually grade" has to come from a queue that already
  //   excludes graded work, not from index+1 on the full list.
  const allForQuestion = (await db.listSubmissionsForQuestion(submission.question_id))
    .slice()
    .sort((a: any, b: any) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
  const fullIndex = allForQuestion.findIndex((s: any) => s.id === submissionId);
  const prevSubmissionId = fullIndex > 0 ? allForQuestion[fullIndex - 1].id : null;
  const nextSubmissionId =
    fullIndex >= 0 && fullIndex + 1 < allForQuestion.length ? allForQuestion[fullIndex + 1].id : null;

  const groups = await getReviewQueueGroupedByQuestion();
  const group = groups.find((g) => g.questionId === submission.question_id);
  const batchEntries = group?.entries ?? [];
  const ungradedIndex = batchEntries.findIndex((e) => e.submissionId === submissionId);
  // If the current submission isn't in the ungraded queue at all (it's
  // already been approved — you got here via Previous), "next ungraded"
  // falls back to the head of the queue rather than an index relative to a
  // position that doesn't exist there.
  const nextUngradedSubmissionId =
    ungradedIndex >= 0
      ? ungradedIndex + 1 < batchEntries.length
        ? batchEntries[ungradedIndex + 1].submissionId
        : null
      : (batchEntries[0]?.submissionId ?? null);
  const prevUngradedSubmissionId = ungradedIndex > 0 ? batchEntries[ungradedIndex - 1].submissionId : null;

  const assessment = await db.getAssessment((question as any)?.assessment_id);

  return (
    <ReviewConsole
      submissionId={submissionId}
      assessmentTitle={(assessment as any)?.title ?? ""}
      batchPosition={fullIndex >= 0 ? fullIndex + 1 : null}
      batchTotal={allForQuestion.length}
      questionPromptText={question?.prompt_text ?? ""}
      originalUrl={originalUrl}
      boxes={boxes.map((b: any) => ({ lineIndex: b.line_index, box: b.box }))}
      steps={steps.map((s: any) => ({
        stepIndex: s.step_index,
        lineIndices: s.line_indices,
        plainText: s.plain_text,
        latex: s.latex,
        role: s.role,
        confidence: s.confidence,
        agreement: s.agreement,
        hasMisconception: misconceptionStepIndices.has(s.step_index),
      }))}
      criteria={criteria.map((c: any) => ({
        criterionKey: c.criterion_key,
        level: c.level,
        score: c.score,
        maxScore: c.max_score,
        evidenceStepIndices: c.evidence_step_indices,
        justification: c.justification,
        confidence: c.confidence,
      }))}
      rubricCriteria={(question?.criteria ?? []).map((c: any) => ({ key: c.key, name: c.name, levels: c.levels }))}
      misconceptions={misconceptionTags.map((t: any) => ({
        name: (taxonomyById.get(t.misconception_id) as any)?.name ?? "unnamed",
        evidenceStepIndices: t.evidence_step_indices,
      }))}
      needsHumanReview={grade?.needs_human_review ?? false}
      totalRecommended={grade?.total_recommended ?? 0}
      maxTotal={grade?.max_total ?? 0}
      prevSubmissionId={prevSubmissionId}
      nextSubmissionId={nextSubmissionId}
      prevUngradedSubmissionId={prevUngradedSubmissionId}
      nextUngradedSubmissionId={nextUngradedSubmissionId}
      releaseFeedback={
        feedback
          ? {
              summary: (feedback as any).summary ?? "",
              strengths: ((feedback as any).strengths ?? []) as { text: string; step_indices: number[] }[],
              nextAction: (feedback as any).next_action ?? "",
            }
          : null
      }
    />
  );
}
