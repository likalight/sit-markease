import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { getReviewQueue } from "@/lib/pipeline/review-queue";
import { ReviewConsole } from "@/components/review-console";

// §11.1 E3 — the hero screen. Three panes: original image + line boxes |
// numbered steps | criterion cards with evidence chips. Approve writes
// final_grades + audit_log; A/J/S keyboard shortcuts; review_seconds timed
// client-side from mount to approve.
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
  const originalUrl = page ? await db.getImageUrl(page.storage_path) : null;

  const transcription = await db.getTranscription(submissionId);
  const steps = transcription ? await db.listSolutionSteps(transcription.id) : [];

  const grade = await db.getGradeRecommendation(submissionId);
  const criteria = grade ? await db.listCriterionResults(grade.id) : [];

  const queue = await getReviewQueue();
  const currentIndex = queue.findIndex((q) => q.submissionId === submissionId);
  const nextSubmissionId = currentIndex >= 0 && currentIndex + 1 < queue.length ? queue[currentIndex + 1].submissionId : null;

  return (
    <ReviewConsole
      submissionId={submissionId}
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
      rubricCriteria={(question?.criteria ?? []).map((c: any) => ({ key: c.key, name: c.name }))}
      needsHumanReview={grade?.needs_human_review ?? false}
      totalRecommended={grade?.total_recommended ?? 0}
      maxTotal={grade?.max_total ?? 0}
      nextSubmissionId={nextSubmissionId}
    />
  );
}
