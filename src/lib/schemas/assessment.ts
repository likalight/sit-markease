import { z } from "zod";

// §7.5 S4 — rubric-aligned assessment. CLAUDE.md rule 4 ("Evidence or
// invalid"): a criterion result without evidence_step_indices fails schema
// validation — enforced here via .min(1), not just requested in the prompt.

export const CriterionResultSchema = z.object({
  criterion_key: z.string(),
  level: z.string(),
  score: z.number(),
  max_score: z.number(),
  evidence_step_indices: z.array(z.number().int()).min(1, "evidence_step_indices must be non-empty"),
  justification: z.string(),
  confidence: z.number().min(0).max(1),
});
export type CriterionResult = z.infer<typeof CriterionResultSchema>;

export const AssessmentSchema = z.object({
  criterion_results: z.array(CriterionResultSchema),
  total_recommended: z.number(),
  max_total: z.number(),
  error_carry_forward_applied: z.boolean().default(false),
  needs_human_review: z.boolean(),
  review_reasons: z.array(z.string()).default([]),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const SymbolicCheckSchema = z.enum(["equivalent", "not_equivalent", "unparseable"]);
export type SymbolicCheck = z.infer<typeof SymbolicCheckSchema>;
