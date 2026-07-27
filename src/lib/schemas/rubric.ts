import { z } from "zod";

// Structured rubric produced by AI from a pasted raw rubric (US1 / prompts/rubric_structure.v1.md).
// Not exercised until M4/E1 — defined now since §16 wants schemas as the single source of truth
// from the start and the `rubric_criteria.levels` jsonb column shape depends on it.

export const RubricLevelSchema = z.object({
  level: z.string(),
  score: z.number(),
  descriptor: z.string(),
});

export const RubricCriterionSchema = z.object({
  key: z.string(),
  name: z.string(),
  weight: z.number(),
  max_score: z.number(),
  levels: z.array(RubricLevelSchema).min(1),
});

export const StructuredRubricSchema = z.object({
  criteria: z.array(RubricCriterionSchema).min(1),
});

export type StructuredRubric = z.infer<typeof StructuredRubricSchema>;
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;
