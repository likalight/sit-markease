import fs from "node:fs";
import path from "node:path";

// Loads the versioned system prompts from /prompts/*.vN.md (CLAUDE.md: "Prompts
// live in /prompts/*.vN.md. Persist prompt_version and model on every
// stage_run.") and builds the per-call user prompt. Pure functions — reused
// by both the real pipeline stages and scripts/seed-ai-fixtures.ts so the
// cache key the fixture is seeded under matches exactly what the pipeline
// computes at request time.

function loadPrompt(filename: string): string {
  return fs.readFileSync(path.join(process.cwd(), "prompts", filename), "utf-8").trim();
}

export const PROMPT_VERSIONS = {
  s2ReadA: "s2_read_a_literal.v1",
  s2ReadB: "s2_read_b_semantic.v1",
  s4Assess: "s4_assess.v1",
  s5Diagnose: "s5_diagnose.v1",
  s6Feedback: "s6_feedback.v1",
  s7Practice: "s7_practice.v1",
  s7Verify: "s7_verify.v1",
  rubricStructure: "rubric_structure.v1",
} as const;

export function s2ReadASystemPrompt(): string {
  return loadPrompt("s2_read_a_literal.v1.md");
}

export function s2ReadAUserPrompt(lineCount: number): string {
  return `The image has ${lineCount} detected line region(s), indexed 1 to ${lineCount} from top to bottom. Transcribe each one. Respond with the JSON shape you were given.`;
}

export function s2ReadBSystemPrompt(): string {
  return loadPrompt("s2_read_b_semantic.v1.md");
}

export function s2ReadBUserPrompt(lineCount: number): string {
  return `The image has ${lineCount} detected line region(s), indexed 1 to ${lineCount} from top to bottom. Identify the solution steps and which line indices each spans. Respond with the JSON shape you were given.`;
}

export function s4AssessSystemPrompt(): string {
  return loadPrompt("s4_assess.v1.md");
}

export function s4AssessUserPrompt(args: {
  questionPromptText: string;
  modelSolution: string | null;
  expectedAnswerLatex: string | null;
  criteria: { key: string; name: string; max_score: number; levels: { level: string; score: number; descriptor: string }[] }[];
  steps: { step_index: number; latex: string; plain_text: string; role: string }[];
  symbolicCheck: "equivalent" | "not_equivalent" | "unparseable";
}): string {
  return [
    `QUESTION: ${args.questionPromptText}`,
    args.modelSolution ? `MODEL SOLUTION (one valid approach, not the only one): ${args.modelSolution}` : "",
    args.expectedAnswerLatex ? `EXPECTED ANSWER: ${args.expectedAnswerLatex}` : "",
    `SYMBOLIC_CHECK: final answer verified ${args.symbolicCheck.toUpperCase().replace("_", " ")}`,
    ``,
    `RUBRIC CRITERIA:`,
    ...args.criteria.map(
      (c) =>
        `- ${c.key} "${c.name}" (max ${c.max_score}): ${c.levels
          .map((l) => `${l.level}=${l.score} (${l.descriptor})`)
          .join("; ")}`
    ),
    ``,
    `STUDENT'S RECONCILED SOLUTION STEPS:`,
    ...args.steps.map((s) => `Step ${s.step_index} [${s.role}]: ${s.plain_text || s.latex}`),
    ``,
    `Grade only against the criteria above. Every criterion result must cite evidence_step_indices. Respond with the JSON shape you were given.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function s5DiagnoseSystemPrompt(): string {
  return loadPrompt("s5_diagnose.v1.md");
}

export function s5DiagnoseUserPrompt(args: {
  steps: { step_index: number; plain_text: string; latex: string }[];
  criteriaJustifications: string[];
  taxonomy: { key: string; name: string; typical_signature: string; description: string }[];
}): string {
  return [
    `STUDENT'S SOLUTION STEPS:`,
    ...args.steps.map((s) => `Step ${s.step_index}: ${s.plain_text || s.latex}`),
    ``,
    `ASSESSMENT NOTES:`,
    ...args.criteriaJustifications,
    ``,
    `MODULE MISCONCEPTION TAXONOMY:`,
    ...args.taxonomy.map((t) => `- ${t.key} "${t.name}": ${t.description} (signature: ${t.typical_signature})`),
    ``,
    `Tag any misconceptions from the taxonomy that match, with evidence_step_indices. Propose novel_candidates for anything that doesn't fit the taxonomy. Respond with the JSON shape you were given.`,
  ].join("\n");
}

export function s6FeedbackSystemPrompt(): string {
  return loadPrompt("s6_feedback.v1.md");
}

export function s6FeedbackUserPrompt(args: {
  steps: { step_index: number; plain_text: string }[];
  totalScore: number;
  maxScore: number;
  misconceptions: { name: string; evidence_step_indices: number[]; observed_signature: string }[];
  tone: "supportive" | "concise" | "socratic";
}): string {
  return [
    `SCORE: ${args.totalScore}/${args.maxScore}`,
    `TONE: ${args.tone}`,
    ``,
    `STUDENT'S SOLUTION STEPS:`,
    ...args.steps.map((s) => `Step ${s.step_index}: ${s.plain_text}`),
    ``,
    `DETECTED MISCONCEPTIONS:`,
    ...args.misconceptions.map((m) => `- ${m.name} at step(s) ${m.evidence_step_indices.join(", ")}: ${m.observed_signature}`),
    ``,
    `Write feedback per the system prompt's principles. Never reveal the full model solution. Respond with the JSON shape you were given.`,
  ].join("\n");
}

export function s7PracticeSystemPrompt(): string {
  return loadPrompt("s7_practice.v1.md");
}

export function s7PracticeUserPrompt(args: {
  misconceptionName: string;
  misconceptionDescription: string;
  observedSignature: string;
  topicTags: string[];
  retrievedItems: { label: string; content: string }[];
}): string {
  return [
    `TARGET MISCONCEPTION: ${args.misconceptionName} — ${args.misconceptionDescription}`,
    `OBSERVED SIGNATURE: ${args.observedSignature}`,
    `TOPIC TAGS: ${args.topicTags.join(", ")}`,
    ``,
    `CANDIDATE SOURCE MATERIAL FROM THE MODULE CORPUS:`,
    ...args.retrievedItems.map((r) => `--- ${r.label} ---\n${r.content}`),
    ``,
    `Compose a 3-5 item scaffolded practice set (scaffold -> target -> extension) targeting this misconception. Prefer retrieved-verbatim items; cite provenance for every item. Respond with the JSON shape you were given.`,
  ].join("\n");
}
