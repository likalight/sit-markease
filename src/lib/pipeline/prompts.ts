import fs from "node:fs";
import path from "node:path";
import type { OcrItem } from "@/lib/schemas/ocr";

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
  s2Read: "s2_read_single.v4",
  s2ReadTyped: "s2_read_typed.v1",
  s4Assess: "s4_assess.v2",
  s5Diagnose: "s5_diagnose.v1",
  s6Feedback: "s6_feedback.v2",
  s7Practice: "s7_practice.v1",
  s7Verify: "s7_verify.v1",
  rubricStructure: "rubric_structure.v1",
  documentExtract: "document_extract.v1",
  assessmentRubricDocument: "assessment_rubric_document.v1",
  scriptMapping: "script_mapping.v1",
} as const;

export function scriptMappingSystemPrompt(): string {
  return loadPrompt("script_mapping.v1.md");
}

const SCRIPT_MAPPING_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "mappings": [
    {
      "question_id": "<one UUID from the supplied question list>",
      "detected_label": "<the student's visible label, e.g. 3(b), or empty string>",
      "regions": [{ "page_index": 0, "x": 0.0, "y": 0.0, "w": 1.0, "h": 0.5 }],
      "confidence": 0.0-1.0,
      "notes": "<short reason for this match>"
    }
  ],
  "unassigned_regions": [{ "page_index": 0, "x": 0.0, "y": 0.0, "w": 1.0, "h": 0.2 }],
  "flags": ["<short_snake_case_flag>"]
}
Return at most one mapping object per question_id; put every disjoint block for that question in its regions array. Page indices are zero-based in the same order as the images.`;

export function scriptMappingUserPrompt(
  questions: {
    id: string;
    position: number;
    prompt_text: string;
    model_solution?: string | null;
    max_score?: number | null;
    criteria?: { name: string; max_score: number }[];
  }[],
  pageCount: number
): string {
  return [
    `This script has ${pageCount} page image(s), supplied in page_index order from 0 to ${pageCount - 1}.`,
    `Map the student's answer regions to these assessment questions and their uploaded rubric sources:`,
    ...questions.map((q) =>
      [
        `- question_id=${q.id}; display_label=Q${q.position}; max_score=${q.max_score ?? ""}; prompt=${q.prompt_text}`,
        q.model_solution ? `  model_solution_hint=${q.model_solution.slice(0, 900)}` : "",
        q.criteria?.length ? `  rubric_criteria=${q.criteria.map((c) => `${c.name} (${c.max_score})`).join("; ")}` : "",
      ].filter(Boolean).join("\n")
    ),
    ``,
    `Use the uploaded rubric/model-solution hints only to identify which answer belongs to which question. Do not solve, correct, or grade. Include only questions for which the script contains visible answer work. Keep uncertain blocks unassigned.`,
    ``,
    SCRIPT_MAPPING_SHAPE,
  ].join("\n");
}

export function assessmentRubricDocumentSystemPrompt(): string {
  return loadPrompt("assessment_rubric_document.v1.md");
}

const ASSESSMENT_RUBRIC_DOCUMENT_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "questions": [
    {
      "position": 1,
      "label": "Q1",
      "prompt_text": "<question prompt or best available identifier>",
      "model_solution": "<worked solution / expected answer text from the mark scheme>",
      "expected_answer_latex": "<final answer as LaTeX, or empty string>",
      "max_score": 10,
      "raw_rubric_notes": "<mark allocations and grading notes for this question>",
      "criteria": [
        {
          "key": "<short_snake_case_key>",
          "name": "<criterion name>",
          "weight": 50,
          "max_score": 5,
          "levels": [
            { "level": "full", "score": 5, "descriptor": "<full-credit evidence>" },
            { "level": "none", "score": 0, "descriptor": "<missing/incorrect evidence>" }
          ]
        }
      ]
    }
  ],
  "warnings": ["<short warning about missing/ambiguous source content>"]
}
Use one object per main assessment question. Preserve subparts inside prompt_text/model_solution/raw_rubric_notes. Criteria weights must sum to 100 per question. Criteria max_score values should sum to that question's max_score.`;

export function assessmentRubricDocumentUserPrompt(args: { assessmentTitle: string; pageCount: number }): string {
  return [
    `ASSESSMENT: ${args.assessmentTitle}`,
    `The uploaded rubric / mark scheme has ${args.pageCount} rendered page image(s), supplied in order.`,
    `Extract the complete question-by-question rubric source for this assessment.`,
    ``,
    ASSESSMENT_RUBRIC_DOCUMENT_SHAPE,
  ].join("\n");
}

export function s2ReadSystemPrompt(): string {
  return loadPrompt("s2_read_single.v4.md");
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

export interface OcrHintLine {
  index: number;
  text: string;
  score: number;
}

export interface OcrHintSource {
  label: string;
  lines: OcrHintLine[];
}

export function pix2textHintSource(items: OcrItem[]): OcrHintSource {
  return { label: "pix2text", lines: items.map((item) => ({ index: item.line_number, text: item.text, score: item.score })) };
}

export function textractHintSource(lines: { text: string; confidence: number }[]): OcrHintSource {
  return { label: "AWS Textract", lines: lines.map((line, i) => ({ index: i + 1, text: line.text, score: line.confidence })) };
}

/** Renders one or two independent OCR passes' output into the plain-text
 * hint block s2ReadUserPrompt prepends to the instructions. A pure function
 * so scripts/seed-ai-fixtures.ts can build the exact same string a live
 * call would, keeping the fixture cache key in sync with the real prompt.
 * Each source degrades independently upstream (s2-transcribe.ts) — this
 * just renders whichever ones actually succeeded, so it works with one
 * source, two, or (if both failed) is never called at all. */
export function renderOcrHints(sources: OcrHintSource[]): string {
  const blocks = sources.map((source) => {
    const lines = source.lines.map((line) => `${line.index}. (${line.score.toFixed(2)}) ${line.text}`).join("\n");
    return `${source.label} pre-transcribed this image, line by line, with confidence scores:\n${lines}`;
  });
  const agreementNote =
    sources.length > 1
      ? "These are two independent OCR passes, not ground truth — where they agree, treat that as stronger evidence; where they disagree, trust the image over either."
      : "Use this as a starting hint, not ground truth — verify against the image itself and correct any OCR misreads.";
  return `${blocks.join("\n\n")}\n\n${agreementNote}`;
}

export function s2ReadUserPrompt(lineCount: number, ocrHint?: string): string {
  const instructions = `The image has ${lineCount} detected line region(s), indexed 1 to ${lineCount} from top to bottom. Transcribe the work and identify the solution steps and which line indices each spans.`;
  const body = ocrHint ? `${ocrHint}\n\n${instructions}` : instructions;
  return `${body}\n\n${S2_READ_SHAPE}`;
}

export function s2ReadTypedSystemPrompt(): string {
  return loadPrompt("s2_read_typed.v1.md");
}

const S2_READ_TYPED_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "steps": [
    { "step_index": 1, "role": "setup" | "substitution" | "rule_application" | "simplification" | "result", "plain_text": "<one-sentence plain-English description of this step>" }
  ],
  "final_answer": { "latex": "<final answer as LaTeX, exactly as the student wrote it, or empty string>", "present": true|false }
}
"role" must be exactly one of the five listed values — no others. Include exactly one entry per step given below, in the same order.`;

export function s2ReadTypedUserPrompt(steps: { step_index: number; latex: string }[]): string {
  return [
    `The student typed these steps directly (no image, no OCR):`,
    ...steps.map((s) => `Step ${s.step_index}: ${s.latex}`),
    ``,
    S2_READ_TYPED_SHAPE,
  ].join("\n");
}

export function s4AssessSystemPrompt(): string {
  return loadPrompt("s4_assess.v2.md");
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
  retrievedReferences?: { label: string; content: string }[];
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
    ...(args.retrievedReferences && args.retrievedReferences.length > 0
      ? [
          `RETRIEVED REFERENCE MATERIAL (background context, not authoritative over the rubric):`,
          ...args.retrievedReferences.map((r) => `- [${r.label}] ${r.content}`),
          ``,
        ]
      : []),
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
  return loadPrompt("s6_feedback.v2.md");
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

export function documentExtractSystemPrompt(): string {
  return loadPrompt("document_extract.v1.md");
}

const DOCUMENT_EXTRACT_SHAPE = `Respond with ONLY this JSON shape, no markdown fences, no commentary:
{
  "prompt_text": "<the question exactly as written, plain text>",
  "model_solution": "<a correct worked solution — transcribed from the document if a model answer is shown, otherwise your own correct solution to the stated question>",
  "expected_answer_latex": "<the final answer as LaTeX, or an empty string if the document doesn't state one>",
  "max_score": <total points available, as a number>,
  "raw_rubric_notes": "<the marking scheme / point breakdown, transcribed as plain text, one criterion per line>"
}`;

export function documentExtractUserPrompt(ocrHint?: string, targetQuestion?: string): string {
  const instructions = targetQuestion
    ? `This image set is a real marking scheme / rubric document for a course assignment. Extract the marking scheme, model answer, and point breakdown that apply to this existing question only: ${targetQuestion}`
    : "This image set is a real marking scheme / rubric document for a course assignment. It typically contains the question, a model answer or expected result, and a point breakdown, all mixed together. Extract each field separately.";
  const body = ocrHint ? `${ocrHint}\n\n${instructions}` : instructions;
  return `${body}\n\n${DOCUMENT_EXTRACT_SHAPE}`;
}
