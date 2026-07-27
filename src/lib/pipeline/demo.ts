import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db/facade";
import { ingestSubmission } from "./s1-ingest";
import { transcribeSubmission } from "./s2-transcribe";
import { assessSubmission } from "./s4-assess";
import { diagnoseSubmission } from "./s5-diagnose";
import { generateFeedback } from "./s6-feedback";
import { generatePracticeSet } from "./s7-practice";

// Backs the landing page's "See it in action" CTA. A judge clicking that
// button must land on real, fully-populated output within ~2 seconds — no
// signup, no empty state, no "upload a file first." Finds an existing fully-
// processed submission (preferring one flagged needs_human_review — the more
// interesting review-console demo), or ingests+processes the gold "dropped_c"
// script fresh if none exists yet (fixture-mode cache hits only, no live
// API calls — same as every other pipeline run in this build).
export async function getOrCreateDemoSubmission(): Promise<string> {
  const submissions = await db.listAllSubmissions();
  let best: { id: string; needsReview: boolean } | null = null;

  for (const s of submissions) {
    const grade = await db.getGradeRecommendation(s.id);
    const feedback = await db.getFeedback(s.id);
    if (!grade || !feedback) continue;
    const needsReview = !!grade.needs_human_review;
    if (needsReview) return s.id; // best possible demo case — stop immediately
    if (!best) best = { id: s.id, needsReview };
  }
  if (best) return best.id;

  // Nothing usable yet — ingest and process the gold "dropped_c" script fresh.
  const question = await db.getFirstQuestion();
  if (!question) {
    throw new Error("no seeded question found — run `npm run seed` first");
  }
  const student = await db.findUserByRole("student");
  const imagePath = path.join(process.cwd(), "eval", "gold", "images", "dropped_c.png");
  const bytes = fs.readFileSync(imagePath);

  const ingested = await ingestSubmission(question.id, bytes, "image/png", student?.id ?? null);
  if ("error" in ingested) {
    throw new Error(`demo ingest failed: ${ingested.error}`);
  }

  const transcribeResult = await transcribeSubmission(ingested.submissionId);
  if (transcribeResult.status !== "needs_human_transcription" && transcribeResult.status !== "failed") {
    const assessResult = await assessSubmission(ingested.submissionId);
    if (assessResult.status === "assessed") {
      const diagnoseResult = await diagnoseSubmission(ingested.submissionId);
      await generateFeedback(ingested.submissionId);
      if (diagnoseResult.status === "diagnosed" && diagnoseResult.detectedCount > 0) {
        await generatePracticeSet(ingested.submissionId);
      }
    }
  }

  return ingested.submissionId;
}
