/**
 * Hand-authors AI responses for the 3 gold-set scripts and seeds them into
 * local-data/ai-cache/, keyed exactly as the real pipeline would key them
 * (same promptVersion/provider/model/system/prompt/image-hash) — see
 * src/lib/ai/cache.ts. Run after `npm run seed-gold`. This is what lets
 * AIMS_FIXTURE_MODE=true actually run the pipeline end-to-end with no
 * Gemini/Groq API keys (docs/DECISIONS.md "M2 — free-tier providers").
 *
 * Extend this file milestone by milestone: S2 fixtures are seeded here now
 * (M2); S4/S5/S6/S7 fixtures are appended as those milestones are built.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { localFiles } from "../src/lib/storage/local-files";
import { aiCache, cacheKey, hashImage } from "../src/lib/ai/cache";
import { s2ReadASystemPrompt, s2ReadAUserPrompt, s2ReadBSystemPrompt, s2ReadBUserPrompt, PROMPT_VERSIONS } from "../src/lib/pipeline/prompts";
import type { ReadA, ReadB } from "../src/lib/schemas/transcription";
import { DEFAULT_MODEL as GEMINI_DEFAULT_MODEL } from "../src/lib/ai/providers/gemini";
import { DEFAULT_MODEL as GROQ_DEFAULT_MODEL } from "../src/lib/ai/providers/groq";

const GEMINI_MODEL = process.env.AIMS_GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL;
const GROQ_MODEL = process.env.AIMS_GROQ_MODEL ?? GROQ_DEFAULT_MODEL;
const GOLD_DIR = path.join(process.cwd(), "eval", "gold");
const LINE_COUNT = 4;

// Hand-authored Read A (literal, line-by-line) + Read B (semantic, step-segmented)
// transcriptions for each gold script — see eval/gold/images/*.png for the
// rendered text. Deliberately near-identical between A and B (both "read"
// the same rendered text) so S3's reconciliation lands in the high-agreement
// band, matching what two independent-but-competent reads of clean text
// should produce.

const FIXTURES: Record<string, { readA: ReadA; readB: ReadB }> = {
  correct: {
    readA: {
      lines: [
        { line_index: 1, latex: "dy/y = x\\,dx", confidence: 0.95, illegible: false },
        { line_index: 2, latex: "\\ln|y| = x^2/2 + C", confidence: 0.93, illegible: false },
        { line_index: 3, latex: "y(0)=2 \\Rightarrow C=\\ln 2", confidence: 0.9, illegible: false },
        { line_index: 4, latex: "y = 2e^{x^2/2}", confidence: 0.94, illegible: false },
      ],
      student_identifier: null,
      overall_legibility: 0.93,
    },
    readB: {
      steps: [
        { step_index: 1, line_indices: [1], latex: "dy/y = x\\,dx", plain_text: "Separate variables: dy/y = x dx", role: "setup", confidence: 0.94 },
        { step_index: 2, line_indices: [2], latex: "\\ln|y| = x^2/2 + C", plain_text: "Integrate both sides, keeping +C", role: "rule_application", confidence: 0.92 },
        { step_index: 3, line_indices: [3], latex: "C=\\ln 2", plain_text: "Apply y(0)=2 to the general solution to find C", role: "substitution", confidence: 0.9 },
        { step_index: 4, line_indices: [4], latex: "y = 2e^{x^2/2}", plain_text: "Final answer: y = 2e^(x^2/2)", role: "result", confidence: 0.95 },
      ],
      final_answer: { latex: "y = 2e^{x^2/2}", present: true },
      flags: [],
    },
  },
  dropped_c: {
    readA: {
      lines: [
        { line_index: 1, latex: "dy/y = x\\,dx", confidence: 0.95, illegible: false },
        { line_index: 2, latex: "\\ln|y| = x^2/2", confidence: 0.92, illegible: false },
        { line_index: 3, latex: "y = e^{x^2/2}", confidence: 0.91, illegible: false },
        { line_index: 4, latex: "y(0)=2 \\Rightarrow y = 2e^{x^2/2}", confidence: 0.88, illegible: false },
      ],
      student_identifier: null,
      overall_legibility: 0.9,
    },
    readB: {
      steps: [
        { step_index: 1, line_indices: [1], latex: "dy/y = x\\,dx", plain_text: "Separate variables: dy/y = x dx", role: "setup", confidence: 0.94 },
        { step_index: 2, line_indices: [2], latex: "\\ln|y| = x^2/2", plain_text: "Integrate both sides — no constant of integration written", role: "rule_application", confidence: 0.9 },
        { step_index: 3, line_indices: [3], latex: "y = e^{x^2/2}", plain_text: "Exponentiate to solve for y, still no +C", role: "simplification", confidence: 0.89 },
        { step_index: 4, line_indices: [4], latex: "y = 2e^{x^2/2}", plain_text: "Applies y(0)=2 directly by inserting a factor of 2, inconsistent with the missing +C", role: "result", confidence: 0.87 },
      ],
      final_answer: { latex: "y = 2e^{x^2/2}", present: true },
      flags: ["constant_of_integration_missing_then_patched"],
    },
  },
  ic_too_early: {
    readA: {
      lines: [
        { line_index: 1, latex: "dy/y = x\\,dx", confidence: 0.95, illegible: false },
        { line_index: 2, latex: "y(0)=2 \\Rightarrow 2/y = 0", confidence: 0.85, illegible: false },
        { line_index: 3, latex: "\\ln|y| = x^2/2", confidence: 0.9, illegible: false },
        { line_index: 4, latex: "y = e^{x^2/2}", confidence: 0.91, illegible: false },
      ],
      student_identifier: null,
      overall_legibility: 0.88,
    },
    readB: {
      steps: [
        { step_index: 1, line_indices: [1], latex: "dy/y = x\\,dx", plain_text: "Separate variables: dy/y = x dx", role: "setup", confidence: 0.93 },
        { step_index: 2, line_indices: [2], latex: "2/y = 0", plain_text: "Substitutes the initial condition into the separated (unintegrated) equation, producing a nonsensical statement", role: "substitution", confidence: 0.82 },
        { step_index: 3, line_indices: [3], latex: "\\ln|y| = x^2/2", plain_text: "Integrates the original separated equation anyway, ignoring the nonsensical step 2", role: "rule_application", confidence: 0.88 },
        { step_index: 4, line_indices: [4], latex: "y = e^{x^2/2}", plain_text: "Final answer given with no constant and no reconciliation of step 2", role: "result", confidence: 0.86 },
      ],
      final_answer: { latex: "y = e^{x^2/2}", present: true },
      flags: ["initial_condition_applied_before_general_solution"],
    },
  },
};

async function main() {
  const mapping = JSON.parse(fs.readFileSync(path.join(GOLD_DIR, "submission-ids.json"), "utf-8"));

  for (const [goldId, fixture] of Object.entries(FIXTURES)) {
    const ids = mapping[goldId];
    if (!ids) {
      console.warn(`  skipping ${goldId}: no submission-ids.json entry — run npm run seed-gold first`);
      continue;
    }

    const processedBytes = localFiles.read(`${ids.submissionId}/processed.png`);
    const imageHash = hashImage(processedBytes.toString("base64"));

    const readASystem = s2ReadASystemPrompt();
    const readAPrompt = s2ReadAUserPrompt(LINE_COUNT);
    const keyA = cacheKey({
      promptVersion: PROMPT_VERSIONS.s2ReadA,
      provider: "gemini",
      model: GEMINI_MODEL,
      system: readASystem,
      prompt: readAPrompt,
      imageHashes: [imageHash],
    });
    aiCache.seed(
      { promptVersion: PROMPT_VERSIONS.s2ReadA, provider: "gemini", model: GEMINI_MODEL, system: readASystem, prompt: readAPrompt, imageHashes: [imageHash] },
      fixture.readA
    );

    const readBSystem = s2ReadBSystemPrompt();
    const readBPrompt = s2ReadBUserPrompt(LINE_COUNT);
    const keyB = cacheKey({
      promptVersion: PROMPT_VERSIONS.s2ReadB,
      provider: "groq",
      model: GROQ_MODEL,
      system: readBSystem,
      prompt: readBPrompt,
      imageHashes: [imageHash],
    });
    aiCache.seed(
      { promptVersion: PROMPT_VERSIONS.s2ReadB, provider: "groq", model: GROQ_MODEL, system: readBSystem, prompt: readBPrompt, imageHashes: [imageHash] },
      fixture.readB
    );

    console.log(`  seeded S2 fixtures for ${goldId} (readA key ${keyA.slice(0, 8)}…, readB key ${keyB.slice(0, 8)}…)`);
  }

  console.log("\nS2 fixture seeding complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
