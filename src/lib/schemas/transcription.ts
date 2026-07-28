import { z } from "zod";

// §7.3 — S2 transcription output shape. Single-model read: one multimodal
// LLM call does literal transcription + step segmentation + confidence in
// one pass (docs/DECISIONS.md — dropped the dual-vendor cross-read design;
// the official brief never required two independent AI reads, only
// "multimodal LLMs" as a technology, so trust now comes from this model's
// own reported confidence/legibility plus S4's symbolic answer check).

export const TranscriptionStepRole = z.enum(["setup", "substitution", "rule_application", "simplification", "result"]);

export const TranscriptionStepSchema = z.object({
  step_index: z.number().int(),
  line_indices: z.array(z.number().int()),
  latex: z.string(),
  plain_text: z.string(),
  role: TranscriptionStepRole,
  confidence: z.number().min(0).max(1),
});

export const TranscriptionReadSchema = z.object({
  steps: z.array(TranscriptionStepSchema),
  final_answer: z.object({ latex: z.string(), present: z.boolean() }),
  flags: z.array(z.string()),
  student_identifier: z.string().nullable(),
  overall_legibility: z.number().min(0).max(1),
});
export type TranscriptionRead = z.infer<typeof TranscriptionReadSchema>;
