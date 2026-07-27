import { z } from "zod";

// §7.8 S7 — targeted practice via RAG.

export const ProvenanceSchema = z.object({
  type: z.enum(["retrieved", "variant_of"]),
  source_label: z.string(),
});

export const PracticeItemSchema = z.object({
  position: z.number().int(),
  difficulty: z.enum(["scaffold", "target", "extension"]),
  prompt_latex: z.string(),
  solution_latex: z.string(),
  hint_ladder: z.array(z.string()).length(3),
  targets_because: z.string(),
  provenance: ProvenanceSchema,
});
export type PracticeItem = z.infer<typeof PracticeItemSchema>;

export const PracticeGenerationSchema = z.object({
  items: z.array(PracticeItemSchema).min(3).max(5),
});
export type PracticeGeneration = z.infer<typeof PracticeGenerationSchema>;
