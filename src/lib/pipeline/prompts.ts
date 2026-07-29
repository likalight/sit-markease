import fs from "node:fs";
import path from "node:path";

// Loads the versioned system prompts from /prompts/*.vN.md (CLAUDE.md: "Prompts
// live in /prompts/*.vN.md. Persist prompt_version and model on every
// stage_run.") and builds the per-call user prompt. Pure functions — reused
// by both the real pipeline stages and scripts/seed-ai-fixtures.ts so the
// cache key the fixture is seeded under matches exactly what the pipeline
// computes at request time.
//
// Every user prompt ends with an explicit, spelled-out JSON shape, not just
// "respond with the JSON shape you were given." That phrase used to be a
// false promise — no shape was ever actually given in text anywhere, and
// the whole thing relied on Gemini's native responseSchema to constrain
// output. That silently broke the moment real live calls happened: Gemini
// didn't reliably honor the schema (returned markdown-fenced JSON with
// different field names), and OpenAI's JSON-object mode has nothing
// constraining it at all without an explicit shape in the prompt itself.
// Fixed for every stage, not just the one that got caught first.

function loadPrompt(filename: string): string {
  return fs.readFileSync(path.join(process.cwd(), "prompts", filename), "utf-8").trim();
}

export const PROMPT_VERSIONS = {
  s2Read: "s2_read_single.v1",
  s4Assess: "s4_assess.v1",
  s5Diagnose: "s5_diagnose.v1",
  s6Feedback: "s6_feedback.v1",
  s7Practice: "s7_practice.v1",
  s7Verify: "s7_verify.v1",
  rubricStructure: "rubric_structure.v1",
} as const;

export function s2ReadSystemPrompt(): string {
  return loadPrompt("s2_read_single.v1.md");
}

const S2_READ_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "steps": [
    {
      "step_index": 1,
      "line_indices": [1],
      "latex": "<this step's math as LaTeX>",
      "plain_text": "<one-sentence plain-English description of this step>",
      "role": "setup" | "substitution" | "rule_application" | "simplification" | "result",
      "confidence": 0.0-1.0
    }
  ],
  "final_answer": { "latex": "<final answer as LaTeX, or empty string>", "present": true|false },
  "flags": ["<short_snake_case_flag>"],
  "student_identifier": "<string or null>",
  "overall_legibility": 0.0-1.0
}
"role" must be exactly one of the five listed values — no others. "flags" is a list of short machine-readable tags (e.g. "constant_of_integration_missing"), not prose; use an empty array if there are none. Any line region that doesn't fit an identifiable step still counts toward "overall_legibility" — mark truly unreadable regions "[ILLEGIBLE]" inside the nearest step's "latex" rather than dropping them.`;

export function s2ReadUserPrompt(lineCount: number): string {
  return `The image has ${lineCount} detected line region(s), indexed 1 to ${lineCount} from top to bottom. Transcribe the work and identify the solution steps and which line indices each spans.\n\n${S2_READ_SHAPE}`;
}

export function s4AssessSystemPrompt(): string {
  return loadPrompt("s4_assess.v1.md");
}

const S4_ASSESS_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "criterion_results": [
    {
      "criterion_key": "<must exactly match one of the criterion keys given above>",
      "level": "<one of that criterion's level names given above>",
      "score": <number>,
      "max_score": <number, must match that criterion's max score above>,
      "evidence_step_indices": [1],
      "justification": "<one sentence citing what the student actually did>",
      "confidence": 0.0-1.0
    }
  ],
  "total_recommended": <number>,
  "max_total": <number>,
  "error_carry_forward_applied": true|false,
  "needs_human_review": true|false,
  "review_reasons": ["<short reason>"]
}
"evidence_step_indices" must never be empty — every criterion result needs at least one cited step. Include exactly one criterion_result per criterion listed above.`;

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
    `Grade only against the criteria above.`,
    ``,
    S4_ASSESS_SHAPE,
  ]
    .filter(Boolean)
    .join("\n");
}

export function s7VerifySystemPrompt(): string {
  return loadPrompt("s7_verify.v1.md");
}

const S7_VERIFY_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{ "valid": true|false, "reason": "<one sentence>", "method": "llm" }`;

export function s7VerifyUserPrompt(promptLatex: string, solutionLatex: string): string {
  return [`PROBLEM: ${promptLatex}`, `STATED SOLUTION: ${solutionLatex}`, ``, S7_VERIFY_SHAPE].join("\n");
}

export function s5DiagnoseSystemPrompt(): string {
  return loadPrompt("s5_diagnose.v1.md");
}

const S5_DIAGNOSE_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "detected": [
    {
      "misconception_key": "<must exactly match one of the taxonomy keys above>",
      "confidence": 0.0-1.0,
      "evidence_step_indices": [1],
      "severity": "notational" | "procedural" | "conceptual",
      "observed_signature": "<what the student actually did that shows this>"
    }
  ],
  "novel_candidates": [
    { "proposed_name": "<short name>", "evidence_step_indices": [1], "confidence": 0.0-1.0 }
  ]
}
"evidence_step_indices" on a detected misconception must never be empty. Use empty arrays for "detected"/"novel_candidates" if there's nothing to report — never omit either key.`;

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
    `Tag any misconceptions from the taxonomy that match. Propose novel_candidates for anything that doesn't fit the taxonomy.`,
    ``,
    S5_DIAGNOSE_SHAPE,
  ].join("\n");
}

export function s6FeedbackSystemPrompt(): string {
  return loadPrompt("s6_feedback.v1.md");
}

const S6_FEEDBACK_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "summary": "<2-3 sentence plain-language summary>",
  "strengths": [ { "text": "<what went well>", "step_indices": [1] } ],
  "breakdown_points": [
    { "step_index": 1, "what_happened": "<plain language>", "why_it_matters": "<plain language>", "misconception_key": "<key or null>" }
  ],
  "next_action": "<one concrete next step for the student>",
  "tone": "supportive" | "concise" | "socratic",
  "word_count": <integer, total words across summary+strengths+breakdown_points+next_action>
}
Use the "tone" value given in the prompt above — don't pick your own.`;

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
    `Write feedback per the system prompt's principles. Never reveal the full model solution.`,
    ``,
    S6_FEEDBACK_SHAPE,
  ].join("\n");
}

export function s7PracticeSystemPrompt(): string {
  return loadPrompt("s7_practice.v1.md");
}

const S7_PRACTICE_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "items": [
    {
      "position": 1,
      "difficulty": "scaffold" | "target" | "extension",
      "prompt_latex": "<problem statement as LaTeX>",
      "solution_latex": "<worked solution as LaTeX>",
      "hint_ladder": ["<hint 1>", "<hint 2>", "<hint 3>"],
      "targets_because": "<one sentence tying this item to the target misconception>",
      "provenance": { "type": "retrieved" | "variant_of", "source_label": "<label from the source material above>" }
    }
  ]
}
Provide 3 to 5 items total, ramped scaffold -> target -> extension. "hint_ladder" must contain EXACTLY 3 hints, ordered least to most revealing. Use provenance.type "retrieved" only for an item copied near-verbatim from the source material; otherwise "variant_of".`;

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
    `Compose a scaffolded practice set targeting this misconception. Prefer retrieved-verbatim items; cite provenance for every item.`,
    ``,
    S7_PRACTICE_SHAPE,
  ].join("\n");
}

export function rubricStructureSystemPrompt(): string {
  return loadPrompt("rubric_structure.v1.md");
}

const RUBRIC_STRUCTURE_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "criteria": [
    {
      "key": "<short_snake_case_key>",
      "name": "<human-readable criterion name>",
      "weight": <number, all criteria weights must sum to 100>,
      "max_score": <number>,
      "levels": [
        { "level": "<e.g. novice>", "score": <number>, "descriptor": "<one sentence>" }
      ]
    }
  ]
}
Every criterion needs at least 2 levels. Weights across all criteria must sum to exactly 100.`;

export function rubricStructureUserPrompt(args: {
  promptText: string;
  modelSolution: string;
  maxScore: number;
  rawRubricNotes: string;
}): string {
  return [
    `QUESTION: ${args.promptText}`,
    `MODEL SOLUTION: ${args.modelSolution}`,
    `TOTAL POINTS AVAILABLE: ${args.maxScore}`,
    ``,
    `EDUCATOR'S RUBRIC NOTES (may be rough or partial):`,
    args.rawRubricNotes,
    ``,
    RUBRIC_STRUCTURE_SHAPE,
  ].join("\n");
}
