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
import { db } from "../src/lib/db/facade";
import { sidecar } from "../src/lib/sidecar/client";
import { aiCache, cacheKey, hashImage } from "../src/lib/ai/cache";
import {
  s2ReadASystemPrompt,
  s2ReadAUserPrompt,
  s2ReadBSystemPrompt,
  s2ReadBUserPrompt,
  s4AssessSystemPrompt,
  s4AssessUserPrompt,
  s5DiagnoseSystemPrompt,
  s5DiagnoseUserPrompt,
  s6FeedbackSystemPrompt,
  s6FeedbackUserPrompt,
  PROMPT_VERSIONS,
} from "../src/lib/pipeline/prompts";
import { stripVariableAssignment } from "../src/lib/pipeline/s4-assess";
import type { ReadA, ReadB } from "../src/lib/schemas/transcription";
import type { Assessment } from "../src/lib/schemas/assessment";
import type { Diagnosis } from "../src/lib/schemas/diagnosis";
import type { Feedback } from "../src/lib/schemas/feedback";
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

// Hand-authored S4 assessment fixtures. Deliberately not a perfect match to
// eval/gold/*.json's human_marks (off by 1 mark on the two flawed scripts) —
// see docs/DECISIONS.md: a suspicious 0.0 MAE would misrepresent what this
// synthetic set can honestly demonstrate.
const ASSESSMENTS: Record<string, Assessment> = {
  correct: {
    criterion_results: [
      { criterion_key: "c_setup", level: "expert", score: 4, max_score: 4, evidence_step_indices: [1], justification: "Correctly separates variables into dy/y = x dx.", confidence: 0.95 },
      { criterion_key: "c_method", level: "expert", score: 6, max_score: 6, evidence_step_indices: [2], justification: "Both sides integrated correctly with the constant of integration retained.", confidence: 0.93 },
      { criterion_key: "c_ic", level: "expert", score: 5, max_score: 5, evidence_step_indices: [3], justification: "Initial condition applied to the general solution to solve for C.", confidence: 0.94 },
      { criterion_key: "c_answer", level: "expert", score: 5, max_score: 5, evidence_step_indices: [4], justification: "Final answer correct and simplified.", confidence: 0.96 },
    ],
    total_recommended: 20,
    max_total: 20,
    error_carry_forward_applied: false,
    needs_human_review: false,
    review_reasons: [],
  },
  dropped_c: {
    criterion_results: [
      { criterion_key: "c_setup", level: "expert", score: 4, max_score: 4, evidence_step_indices: [1], justification: "Correctly separates variables into dy/y = x dx.", confidence: 0.92 },
      { criterion_key: "c_method", level: "proficient", score: 4, max_score: 6, evidence_step_indices: [2, 3], justification: "Integrated correctly but never wrote the constant of integration — the general solution loses a degree of freedom.", confidence: 0.8 },
      { criterion_key: "c_ic", level: "proficient", score: 3, max_score: 5, evidence_step_indices: [4], justification: "The initial condition is patched onto an already-particular solution via an ad-hoc factor of 2, rather than solved for a genuine constant C.", confidence: 0.75 },
      { criterion_key: "c_answer", level: "expert", score: 5, max_score: 5, evidence_step_indices: [4], justification: "Final answer matches the expected result (verified symbolically).", confidence: 0.9 },
    ],
    total_recommended: 16,
    max_total: 20,
    error_carry_forward_applied: true,
    needs_human_review: true,
    review_reasons: ["method_omits_constant_of_integration_but_reaches_correct_answer"],
  },
  ic_too_early: {
    criterion_results: [
      { criterion_key: "c_setup", level: "expert", score: 4, max_score: 4, evidence_step_indices: [1], justification: "Correctly separates variables into dy/y = x dx.", confidence: 0.9 },
      { criterion_key: "c_method", level: "novice", score: 1, max_score: 6, evidence_step_indices: [3], justification: "Integration is performed but is disconnected from the flawed step 2 — the overall method is incoherent.", confidence: 0.7 },
      { criterion_key: "c_ic", level: "novice", score: 1, max_score: 5, evidence_step_indices: [2], justification: "Initial condition substituted into the unintegrated separated equation, producing the nonsensical statement 2/y = 0.", confidence: 0.72 },
      { criterion_key: "c_answer", level: "novice", score: 1, max_score: 5, evidence_step_indices: [4], justification: "Final answer omits the constant entirely and does not match the expected result (verified symbolically).", confidence: 0.85 },
    ],
    total_recommended: 7,
    max_total: 20,
    error_carry_forward_applied: false,
    needs_human_review: true,
    review_reasons: ["unusual_and_inconsistent_method", "initial_condition_misapplied"],
  },
};

// Hand-authored S5 diagnosis fixtures, matching eval/gold/*.json's
// expected_misconceptions.
const DIAGNOSES: Record<string, Diagnosis> = {
  correct: { detected: [], novel_candidates: [] },
  dropped_c: {
    detected: [
      {
        misconception_key: "mc_constant_of_integration_dropped",
        confidence: 0.85,
        evidence_step_indices: [2, 3],
        severity: "notational",
        observed_signature: "Integrated to ln|y| = x^2/2 with no +C, then patched the final answer with an ad-hoc factor of 2 at step 4 to match the initial condition.",
      },
    ],
    novel_candidates: [],
  },
  ic_too_early: {
    detected: [
      {
        misconception_key: "mc_ic_applied_before_general",
        confidence: 0.82,
        evidence_step_indices: [2],
        severity: "conceptual",
        observed_signature: "Substituted y(0)=2 into the separated but unintegrated equation, producing the nonsensical statement 2/y = 0.",
      },
    ],
    novel_candidates: [],
  },
};

// Hand-authored S6 feedback fixtures.
const FEEDBACKS: Record<string, Feedback> = {
  correct: {
    summary: "Clean, correct solution from start to finish.",
    strengths: [
      { text: "Separated variables correctly and integrated with the constant of integration retained.", step_indices: [1, 2] },
      { text: "Applied the initial condition to the general solution to solve for C.", step_indices: [3] },
    ],
    breakdown_points: [],
    next_action: "Try a separable ODE with a different initial condition to confirm the method generalizes for you.",
    tone: "supportive",
    word_count: 60,
  },
  dropped_c: {
    summary: "Your setup and final answer were both correct, but the method has a gap worth fixing.",
    strengths: [{ text: "Separated variables correctly: dy/y = x dx.", step_indices: [1] }],
    breakdown_points: [
      {
        step_index: 2,
        what_happened: "You wrote ln|y| = x^2/2 without a constant of integration.",
        why_it_matters: "Every indefinite integral has a family of solutions differing by a constant — dropping it means your 'general solution' is actually only one particular case, and you have to guess your way back to the right answer instead of solving for it.",
        misconception_key: "mc_constant_of_integration_dropped",
      },
    ],
    next_action: "Redo step 2 writing +C explicitly, then solve for C using y(0)=2 — you'll land on the same answer, but through a method that works for any initial condition.",
    tone: "supportive",
    word_count: 95,
  },
  ic_too_early: {
    summary: "Your setup was right, but the initial condition got applied at the wrong point in the process.",
    strengths: [{ text: "Separated variables correctly: dy/y = x dx.", step_indices: [1] }],
    breakdown_points: [
      {
        step_index: 2,
        what_happened: "You substituted y(0)=2 directly into dy/y = x dx before integrating, producing 2/y = 0.",
        why_it_matters: "The initial condition applies to the solved (integrated) function, not to the differential relationship itself — substituting this early throws away the information you need and produces a statement that isn't actually meaningful.",
        misconception_key: "mc_ic_applied_before_general",
      },
    ],
    next_action: "Integrate first to get the general solution with +C, and only then substitute y(0)=2 to solve for C.",
    tone: "supportive",
    word_count: 90,
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

  console.log("\nSeeding S4 assessment fixtures (requires S2/S3 already run — npm run seed-gold then transcribeSubmission)...");
  for (const [goldId, assessment] of Object.entries(ASSESSMENTS)) {
    const ids = mapping[goldId];
    if (!ids) continue;

    const submission = await db.getSubmission(ids.submissionId);
    const question = await db.getQuestionWithRubric(submission.question_id);
    const transcription = await db.getTranscription(ids.submissionId);
    if (!transcription) {
      console.warn(`  skipping S4 fixture for ${goldId}: no transcription found — run the S2/S3 pipeline first`);
      continue;
    }
    const steps = await db.listSolutionSteps(transcription.id);

    const symbolicResult = await sidecar.mathEquivalent(
      stripVariableAssignment(transcription.final_answer_latex),
      stripVariableAssignment(question.expected_answer_latex)
    );
    const symbolicCheck = !symbolicResult.parsed ? "unparseable" : symbolicResult.equivalent ? "equivalent" : "not_equivalent";

    const system = s4AssessSystemPrompt();
    const prompt = s4AssessUserPrompt({
      questionPromptText: question.prompt_text,
      modelSolution: question.model_solution,
      expectedAnswerLatex: question.expected_answer_latex,
      criteria: question.criteria,
      steps,
      symbolicCheck,
    });

    const key = cacheKey({ promptVersion: PROMPT_VERSIONS.s4Assess, provider: "gemini", model: GEMINI_MODEL, system, prompt });
    aiCache.seed({ promptVersion: PROMPT_VERSIONS.s4Assess, provider: "gemini", model: GEMINI_MODEL, system, prompt }, assessment);
    console.log(`  seeded S4 fixture for ${goldId} (symbolic=${symbolicCheck}, key ${key.slice(0, 8)}…)`);
  }

  console.log("\nSeeding S5 diagnosis fixtures (requires S4 already run)...");
  for (const [goldId, diagnosis] of Object.entries(DIAGNOSES)) {
    const ids = mapping[goldId];
    if (!ids) continue;

    const submission = await db.getSubmission(ids.submissionId);
    const transcription = await db.getTranscription(ids.submissionId);
    const grade = await db.getGradeRecommendation(ids.submissionId);
    if (!transcription || !grade) {
      console.warn(`  skipping S5 fixture for ${goldId}: run S2/S3/S4 first`);
      continue;
    }
    const steps = await db.listSolutionSteps(transcription.id);
    const criteria = await db.listCriterionResults(grade.id);
    const module_ = await db.getModuleForQuestion(submission.question_id);
    const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];

    const system = s5DiagnoseSystemPrompt();
    const prompt = s5DiagnoseUserPrompt({
      steps,
      criteriaJustifications: criteria.map((c: any) => `${c.level} on ${c.criterion_key}: ${c.justification}`),
      taxonomy: taxonomy.map((t: any) => ({ key: t.key, name: t.name, typical_signature: t.typical_signature, description: t.description })),
    });

    const key = cacheKey({ promptVersion: PROMPT_VERSIONS.s5Diagnose, provider: "groq", model: GROQ_MODEL, system, prompt });
    aiCache.seed({ promptVersion: PROMPT_VERSIONS.s5Diagnose, provider: "groq", model: GROQ_MODEL, system, prompt }, diagnosis);
    console.log(`  seeded S5 fixture for ${goldId} (${diagnosis.detected.length} detected, key ${key.slice(0, 8)}…)`);
  }

  console.log("\nSeeding S6 feedback fixtures (requires S2/S3/S4 already run)...");
  for (const [goldId, feedback] of Object.entries(FEEDBACKS)) {
    const ids = mapping[goldId];
    if (!ids) continue;

    const submission = await db.getSubmission(ids.submissionId);
    const transcription = await db.getTranscription(ids.submissionId);
    const grade = await db.getGradeRecommendation(ids.submissionId);
    if (!transcription || !grade) {
      console.warn(`  skipping S6 fixture for ${goldId}: run S2/S3/S4 first`);
      continue;
    }
    const steps = await db.listSolutionSteps(transcription.id);
    const module_ = await db.getModuleForQuestion(submission.question_id);
    const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
    const taxonomyByKey = new Map(taxonomy.map((t: any) => [t.key, t]));
    const diagnosis = DIAGNOSES[goldId];
    // Mirrors src/lib/pipeline/s6-feedback.ts's real mapping (taxonomy name,
    // not the misconception_key) so the prompt text — and therefore the
    // cache key — matches exactly what the real pipeline builds at request time.
    const misconceptions = (diagnosis?.detected ?? []).map((d) => ({
      name: (taxonomyByKey.get(d.misconception_key) as any)?.name ?? "unnamed misconception",
      evidence_step_indices: d.evidence_step_indices,
      observed_signature: d.observed_signature,
    }));

    const system = s6FeedbackSystemPrompt();
    const prompt = s6FeedbackUserPrompt({
      steps: steps.map((s: any) => ({ step_index: s.step_index, plain_text: s.plain_text })),
      totalScore: grade.total_recommended,
      maxScore: grade.max_total,
      misconceptions,
      tone: "supportive",
    });

    const key = cacheKey({ promptVersion: PROMPT_VERSIONS.s6Feedback, provider: "gemini", model: GEMINI_MODEL, system, prompt });
    aiCache.seed({ promptVersion: PROMPT_VERSIONS.s6Feedback, provider: "gemini", model: GEMINI_MODEL, system, prompt }, feedback);
    console.log(`  seeded S6 fixture for ${goldId} (key ${key.slice(0, 8)}…)`);
  }

  console.log("\nFixture seeding complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
