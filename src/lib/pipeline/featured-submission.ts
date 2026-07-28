import { db } from "@/lib/db/facade";

// Backs the landing page's "a real script, annotated" section. Finds an
// existing, fully-processed real submission to show — preferring one
// flagged needs_human_review (the more interesting review-console case).
// Never fabricates one: if nothing real exists yet, the landing page simply
// omits this section rather than ingesting a synthetic script to fill the
// gap.
export async function getMostRecentRealSubmission(): Promise<string | null> {
  const submissions = await db.listAllSubmissions();
  let best: { id: string; needsReview: boolean } | null = null;

  for (const s of submissions) {
    const grade = await db.getGradeRecommendation(s.id);
    const feedback = await db.getFeedback(s.id);
    if (!grade || !feedback) continue;
    const needsReview = !!grade.needs_human_review;
    if (needsReview) return s.id;
    if (!best) best = { id: s.id, needsReview };
  }

  return best?.id ?? null;
}
