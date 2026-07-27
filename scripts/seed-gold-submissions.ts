/**
 * Ingests the 3 synthetic gold-set scripts (eval/gold/*.json) as real
 * submissions against the seeded demo question, via the same S1 ingest path
 * the upload API uses. Requires the sidecar running at SIDECAR_URL and
 * `npm run seed` already having run. Writes eval/gold/submission-ids.json
 * mapping goldId -> { submissionId, pageId } so scripts/seed-ai-fixtures.ts
 * can seed the AI cache against the exact processed-image bytes these
 * submissions persisted.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { localStore } from "../src/lib/db/local-store";
import { ingestSubmission } from "../src/lib/pipeline/s1-ingest";

const GOLD_DIR = path.join(process.cwd(), "eval", "gold");

async function main() {
  const question = localStore.findOne("questions", (q: any) => q.position === 1);
  if (!question) {
    throw new Error("no seeded question found — run `npm run seed` first");
  }
  const student = localStore.findOne("users", (u: any) => u.role === "student");

  const goldFiles = fs.readdirSync(GOLD_DIR).filter((f) => f.endsWith(".json") && f !== "submission-ids.json");
  const mapping: Record<string, { submissionId: string; pageId: string }> = {};

  for (const file of goldFiles) {
    const gold = JSON.parse(fs.readFileSync(path.join(GOLD_DIR, file), "utf-8"));
    const imagePath = path.join(GOLD_DIR, gold.image);
    const bytes = fs.readFileSync(imagePath);

    const result = await ingestSubmission(question.id, bytes, "image/png", student?.id ?? null);
    if ("error" in result) {
      throw new Error(`ingest failed for ${gold.id}: ${result.error}`);
    }

    mapping[gold.id] = { submissionId: result.submissionId, pageId: result.pageId };
    console.log(`  ingested ${gold.id} -> submission ${result.submissionId} (${result.boxes.length} lines)`);
  }

  fs.writeFileSync(path.join(GOLD_DIR, "submission-ids.json"), JSON.stringify(mapping, null, 2));
  console.log("\nWrote eval/gold/submission-ids.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
