import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { sidecar } from "@/lib/sidecar/client";
import { retrieveChunks } from "@/lib/rag/retrieve";
import { AssessmentSchema, type SymbolicCheck } from "@/lib/schemas/assessment";
import { assessNativeSchema } from "./native-schemas";
import { s4AssessSystemPrompt, s4AssessUserPrompt, PROMPT_VERSIONS } from "./prompts";

// §7.5 S4 — rubric-aligned assessment. Runs on the `primary` role.

// SymPy's parse_latex parses expressions, not equations — "y = 2e^{x^2/2}"
// fails to parse where "2e^{x^2/2}" succeeds. Final answers are near-always
// written as "<var> = <expr>", so strip a single leading "identifier ="
// before handing off to the sidecar. Found by seeding this milestone's gold
// fixtures: every equation-form answer came back "unparseable" until this
// was added (docs/STUBS.md).
export function stripVariableAssignment(latex: string): string {
  return latex.replace(/^\s*[a-zA-Z](_\{?[a-zA-Z0-9]+\}?)?\s*=\s*/, "").trim();
}

async function computeSymbolicCheck(
  finalAnswerLatex: string | null,
  expectedAnswerLatex: string | null
): Promise<SymbolicCheck> {
  if (!finalAnswerLatex || !expectedAnswerLatex) return "unparseable";
  try {
    const result = await sidecar.mathEquivalent(
      stripVariableAssignment(finalAnswerLatex),
      stripVariableAssignment(expectedAnswerLatex)
    );
    if (!result.parsed) return "unparseable";
    return result.equivalent ? "equivalent" : "not_equivalent";
  } catch {
    return "unparseable";
  }
}

// RAG-matched rubric grounding — mirrors the same corpus lookup S7 already
// does (s7-practice.ts), reused here so scoring, not just practice
// generation, gets to see relevant worked examples/misconception notes for
// this topic. Background context only, never authoritative over the rubric
// itself (see s4_assess.v2.md) — CLAUDE.md rule 8: any failure here just
// means no reference material, never a failed assessment.
export async function retrieveRubricReferences(
  questionId: string,
  question: { topic_tags?: string[] | null }
): Promise<{ label: string; content: string }[]> {
  try {
    const module_ = await db.getModuleForQuestion(questionId);
    if (!module_) return [];

    const resources = await db.listResources(module_.id);
    const chunks = await db.listResourceChunks(resources.map((r: any) => r.id));
    if (chunks.length === 0) return [];

    const resourceLabelById = new Map(resources.map((r: any) => [r.id, r.label]));
    const query = (question.topic_tags ?? []).join(" ");
    const retrieved = await retrieveChunks(query, chunks, 3);

    return retrieved.map((c: any) => ({ label: resourceLabelById.get(c.resource_id) ?? "unknown source", content: c.content }));
  } catch {
    return [];
  }
}

export interface AssessResult {
  status: "assessed" | "failed";
  gradeRecommendationId?: string;
}

/** Runs S4 for a submission that has a reconciled transcription (M2/S3).
 * Persists grade_recommendations + criterion_results. Degrades rather than
 * throws (CLAUDE.md rule 8) — on failure the submission is left as-is and a
 * stage_runs row records why; a human can still assess manually. */
export async function assessSubmission(submissionId: string): Promise<AssessResult> {
  // Idempotency guard — see s2-transcribe.ts's identical guard for why this
  // matters against Supabase specifically (.maybeSingle() errors on 2+ rows,
  // where the local store silently didn't).
  const existingGrade = await db.getGradeRecommendation(submissionId);
  if (existingGrade) {
    return { status: "assessed", gradeRecommendationId: (existingGrade as any).id };
  }

  const submission = await db.getSubmission(submissionId);
  if (!submission) {
    await db.logStageRun({ submissionId, stage: "S4_assess", status: "failed", error: "submission not found" });
    return { status: "failed" };
  }

  const question = await db.getQuestionWithRubric(submission.question_id);
  const transcription = await db.getTranscription(submissionId);
  if (!question?.rubric || !transcription) {
    await db.logStageRun({
      submissionId,
      stage: "S4_assess",
      status: "failed",
      error: !question?.rubric ? "question has no rubric" : "no reconciled transcription",
    });
    return { status: "failed" };
  }

  const steps = await db.listSolutionSteps(transcription.id);
  const symbolicCheck = await computeSymbolicCheck(transcription.final_answer_latex, question.expected_answer_latex);
  const retrievedReferences = await retrieveRubricReferences(submission.question_id, question);

  let assessment;
  try {
    assessment = await callStructured({
      stage: "S4_assess",
      promptVersion: PROMPT_VERSIONS.s4Assess,
      role: "primary",
      system: s4AssessSystemPrompt(),
      prompt: s4AssessUserPrompt({
        questionPromptText: question.prompt_text,
        modelSolution: question.model_solution,
        expectedAnswerLatex: question.expected_answer_latex,
        criteria: question.criteria,
        steps,
        symbolicCheck,
        retrievedReferences,
      }),
      schema: AssessmentSchema,
      nativeSchema: assessNativeSchema,
      temperature: 0.1,
      submissionId,
    });
  } catch (err) {
    await db.logStageRun({
      submissionId,
      stage: "S4_assess",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "failed" };
  }

  // Middling transcription agreement forces human review regardless of what
  // the model itself decided (§7.5 principle).
  const needsHumanReview =
    assessment.needs_human_review || transcription.transcription_agreement < 0.85;
  const reviewReasons = assessment.needs_human_review
    ? (assessment.review_reasons ?? [])
    : [...(assessment.review_reasons ?? []), "transcription_agreement_below_threshold"];

  const gradeRecommendation = await db.createGradeRecommendation({
    submission_id: submissionId,
    total_recommended: assessment.total_recommended,
    max_total: assessment.max_total,
    needs_human_review: needsHumanReview,
    review_reasons: needsHumanReview ? reviewReasons : [],
    score_spread: null,
    symbolic_check: symbolicCheck,
    model: "primary",
    prompt_version: PROMPT_VERSIONS.s4Assess,
  });

  const criteriaByKey = new Map<string, any>(question.criteria.map((c: any) => [c.key, c]));
  await db.insertCriterionResults(
    assessment.criterion_results.map((c) => ({
      grade_recommendation_id: (gradeRecommendation as any).id,
      criterion_id: criteriaByKey.get(c.criterion_key)?.id ?? null,
      criterion_key: c.criterion_key,
      level: c.level,
      score: c.score,
      max_score: c.max_score,
      evidence_step_indices: c.evidence_step_indices,
      justification: c.justification,
      confidence: c.confidence,
    }))
  );

  await db.logStageRun({ submissionId, stage: "S4_assess", status: "succeeded", promptVersion: PROMPT_VERSIONS.s4Assess });

  return { status: "assessed", gradeRecommendationId: gradeRecommendation.id };
}
