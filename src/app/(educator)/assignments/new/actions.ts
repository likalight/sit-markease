"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { structureRubric } from "@/lib/pipeline/rubric-structure";

// Educator-facing "create a new question in any subject" — the concrete
// fix for the app being permanently locked to one seeded math question
// (docs/DECISIONS.md). Pastes a question + model solution + rough rubric
// notes, AI structures the rubric into weighted criteria, and the new
// question immediately becomes what students submit against
// (db.getCurrentQuestion() picks the most recently created one).
export async function createQuestionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    redirect("/login");
  }

  const assignmentName = String(formData.get("assignmentName") ?? "").trim();
  const promptText = String(formData.get("promptText") ?? "").trim();
  const modelSolution = String(formData.get("modelSolution") ?? "").trim();
  const expectedAnswerLatex = String(formData.get("expectedAnswerLatex") ?? "").trim();
  const maxScore = Number(formData.get("maxScore") ?? 0);
  const rawRubricNotes = String(formData.get("rubricNotes") ?? "").trim();
  const topicTagsRaw = String(formData.get("topicTags") ?? "").trim();

  if (!assignmentName || !promptText || !modelSolution || !rawRubricNotes || !maxScore || maxScore <= 0) {
    redirect(
      `/assignments/new?error=${encodeURIComponent(
        "fill in the assignment name, question, model solution, total points, and rubric notes"
      )}`
    );
  }

  const topicTags = topicTagsRaw
    ? topicTagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  let structured;
  try {
    structured = await structureRubric({ promptText, modelSolution, maxScore, rawRubricNotes });
  } catch (err) {
    redirect(
      `/assignments/new?error=${encodeURIComponent(
        `couldn't structure that rubric — ${err instanceof Error ? err.message : String(err)}`
      )}`
    );
  }

  const module_ = await db.findOrCreateDefaultModule(user!.id);
  const assessment = await db.createAssessment((module_ as any).id, assignmentName);
  const existingCount = await db.countQuestionsForAssessment((assessment as any).id);

  const question = await db.createQuestion({
    assessment_id: (assessment as any).id,
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

  redirect("/assignments");
}
