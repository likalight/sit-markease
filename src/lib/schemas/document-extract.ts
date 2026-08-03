import { z } from "zod";

// Structured extraction from an uploaded marking-scheme/rubric document —
// separates "the question," "the model answer," and "the point breakdown"
// out of one real document, so they can prefill the same fields an educator
// would otherwise type by hand (src/app/(educator)/assignments/new).
export const DocumentExtractSchema = z.object({
  prompt_text: z.string(),
  model_solution: z.string(),
  expected_answer_latex: z.string(),
  max_score: z.number(),
  raw_rubric_notes: z.string(),
});

export type DocumentExtract = z.infer<typeof DocumentExtractSchema>;
