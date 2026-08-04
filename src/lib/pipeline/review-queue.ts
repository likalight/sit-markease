import { db } from "@/lib/db/facade";

// §11.1 E3 / §5.1: "Review queue opens, lowest confidence first." Now
// grouped by question (Gradescope-style) — an instructor works through one
// question's submissions against the same rubric before switching, instead
// of a flat list interleaving unrelated questions.
export interface ReviewQueueEntry {
  submissionId: string;
  questionId: string;
  avgConfidence: number;
  needsHumanReview: boolean;
  totalRecommended: number | null;
  maxTotal: number | null;
}

export interface ReviewQueueGroup {
  questionId: string;
  questionPromptText: string;
  assessmentTitle: string;
  entries: ReviewQueueEntry[];
}

export async function getReviewQueue(): Promise<ReviewQueueEntry[]> {
  const submissions = await db.listAllSubmissions();
  const entries: ReviewQueueEntry[] = [];

  for (const submission of submissions) {
    const finalGrade = await db.getFinalGrade(submission.id);
    if (finalGrade) continue; // already approved — not in the queue

    const grade = await db.getGradeRecommendation(submission.id);
    if (!grade) continue; // hasn't reached S4 yet

    const criteria = await db.listCriterionResults(grade.id);
    const avgConfidence = criteria.length
      ? criteria.reduce((sum: number, c: any) => sum + c.confidence, 0) / criteria.length
      : 0;

    entries.push({
      submissionId: submission.id,
      questionId: submission.question_id,
      avgConfidence,
      needsHumanReview: grade.needs_human_review,
      totalRecommended: grade.total_recommended,
      maxTotal: grade.max_total,
    });
  }

  return entries.sort((a, b) => a.avgConfidence - b.avgConfidence);
}

/** Same queue, grouped by question — each group internally sorted lowest
 * confidence first, groups ordered by which needs the most attention
 * (lowest average confidence across the group) first. */
export async function getReviewQueueGroupedByQuestion(): Promise<ReviewQueueGroup[]> {
  const flat = await getReviewQueue();
  const byQuestion = new Map<string, ReviewQueueEntry[]>();
  for (const entry of flat) {
    const list = byQuestion.get(entry.questionId) ?? [];
    list.push(entry);
    byQuestion.set(entry.questionId, list);
  }

  const groups: ReviewQueueGroup[] = [];
  for (const [questionId, entries] of byQuestion) {
    const question = await db.getQuestionWithRubric(questionId);
    const assessment = question ? await db.getAssessment((question as any).assessment_id) : null;
    groups.push({
      questionId,
      questionPromptText: (question as any)?.prompt_text ?? "",
      assessmentTitle: (assessment as any)?.title ?? "Untitled assignment",
      entries,
    });
  }

  return groups.sort((a, b) => {
    const avgA = a.entries.reduce((s, e) => s + e.avgConfidence, 0) / a.entries.length;
    const avgB = b.entries.reduce((s, e) => s + e.avgConfidence, 0) / b.entries.length;
    return avgA - avgB;
  });
}
