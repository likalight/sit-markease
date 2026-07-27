import { z } from "zod";

// §7.7 S6 — feedback generation.

export const StrengthSchema = z.object({
  text: z.string(),
  step_indices: z.array(z.number().int()),
});

export const BreakdownPointSchema = z.object({
  step_index: z.number().int(),
  what_happened: z.string(),
  why_it_matters: z.string(),
  misconception_key: z.string().nullable().optional(),
});

export const FeedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(StrengthSchema),
  breakdown_points: z.array(BreakdownPointSchema),
  next_action: z.string(),
  tone: z.enum(["supportive", "concise", "socratic"]),
  word_count: z.number().int(),
});
export type Feedback = z.infer<typeof FeedbackSchema>;
