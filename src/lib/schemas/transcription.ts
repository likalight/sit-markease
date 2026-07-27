import { z } from "zod";

// §7.3 — S2 dual-read output shapes.

export const ReadALineSchema = z.object({
  line_index: z.number().int(),
  latex: z.string(),
  confidence: z.number().min(0).max(1),
  illegible: z.boolean(),
});

export const ReadASchema = z.object({
  lines: z.array(ReadALineSchema),
  student_identifier: z.string().nullable(),
  overall_legibility: z.number().min(0).max(1),
});
export type ReadA = z.infer<typeof ReadASchema>;

export const ReadBStepRole = z.enum(["setup", "substitution", "rule_application", "simplification", "result"]);

export const ReadBStepSchema = z.object({
  step_index: z.number().int(),
  line_indices: z.array(z.number().int()),
  latex: z.string(),
  plain_text: z.string(),
  role: ReadBStepRole,
  confidence: z.number().min(0).max(1),
});

export const ReadBSchema = z.object({
  steps: z.array(ReadBStepSchema),
  final_answer: z.object({ latex: z.string(), present: z.boolean() }),
  flags: z.array(z.string()),
});
export type ReadB = z.infer<typeof ReadBSchema>;
