import { db } from "@/lib/db/facade";

// §11.1 E3 / §5.1: "Review queue opens, lowest confidence first." Only one
// question is seeded in this build, so this scans all submissions rather
// than filtering by question — fine at hackathon scale, revisit if the
// question set grows.
export interface ReviewQueueEntry {
  submissionId: string;
  questionId: string;
  avgConfidence: number;
  needsHumanReview: boolean;
  totalRecommended: number | null;
  maxTotal: number | null;
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
