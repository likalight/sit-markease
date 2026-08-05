import { z } from "zod";
import { RubricCriterionSchema } from "./rubric";

export const AssessmentRubricQuestionSchema = z.object({
  position: z.number().int().positive(),
  label: z.string(),
  prompt_text: z.string(),
  model_solution: z.string(),
  expected_answer_latex: z.string(),
  max_score: z.number().positive(),
  raw_rubric_notes: z.string(),
  criteria: z.array(RubricCriterionSchema).min(1),
});

export const AssessmentRubricDocumentSchema = z.object({
  questions: z.array(AssessmentRubricQuestionSchema).min(1).max(30),
  warnings: z.array(z.string()),
});

export type AssessmentRubricQuestion = z.infer<typeof AssessmentRubricQuestionSchema>;
export type AssessmentRubricDocument = z.infer<typeof AssessmentRubricDocumentSchema>;
