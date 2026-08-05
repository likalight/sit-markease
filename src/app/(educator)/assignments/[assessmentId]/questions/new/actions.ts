"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { structureRubric } from "@/lib/pipeline/rubric-structure";

// Add a question to an EXISTING assessment — every /assignments/new
// submission previously always created a brand-new assessment with exactly
// one question, with no way to build a real multi-question paper through
// the product itself (every multi-question assessment so far was built by
// a one-off script). Same steps as createQuestionAction minus the
// assessment-creation step.
export async function addQuestionAction(assessmentId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const promptText = String(formData.get("promptText") ?? "").trim();
  const modelSolution = String(formData.get("modelSolution") ?? "").trim();
  const expectedAnswerLatex = String(formData.get("expectedAnswerLatex") ?? "").trim();
  const maxScore = Number(formData.get("maxScore") ?? 0);
  const rawRubricNotes = String(formData.get("rubricNotes") ?? "").trim();
  const topicTagsRaw = String(formData.get("topicTags") ?? "").trim();

  if (!promptText || !modelSolution || !rawRubricNotes || !maxScore || maxScore <= 0) {
    redirect(
      `/assignments/${assessmentId}/questions/new?error=${encodeURIComponent(
        "fill in the question, model solution, total points, and rubric notes"
      )}`
    );
  }

  const topicTags = topicTagsRaw ? topicTagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  let structured;
  try {
    structured = await structureRubric({ promptText, modelSolution, maxScore, rawRubricNotes });
  } catch (err) {
    redirect(
      `/assignments/${assessmentId}/questions/new?error=${encodeURIComponent(
        `couldn't structure that rubric — ${err instanceof Error ? err.message : String(err)}`
      )}`
    );
  }

  const existingCount = await db.countQuestionsForAssessment(assessmentId);
  const question = await db.createQuestion({
    assessment_id: assessmentId,
    position: existingCount + 1,
    prompt_text: promptText,
    prompt_latex: null,
    model_solution: modelSolution,
    expected_answer_latex: expectedAnswerLatex || null,
    topic_tags: topicTags,
    max_score: maxScore,
  });

  const rubric = await db.createRubric((question as any).id);
  await db.insertRubricCriteria(
    structured!.criteria.map((c) => ({
      rubric_id: (rubric as any).id,
      key: c.key,
      name: c.name,
      weight: c.weight,
      max_score: c.max_score,
      levels: c.levels,
    }))
  );

  redirect(`/assignments/${assessmentId}/rubric`);
}
