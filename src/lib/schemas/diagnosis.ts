import { z } from "zod";

// §7.6 S5 — misconception detection.

export const DetectedMisconceptionSchema = z.object({
  misconception_key: z.string(),
  confidence: z.number().min(0).max(1),
  evidence_step_indices: z.array(z.number().int()).min(1, "evidence_step_indices must be non-empty"),
  severity: z.enum(["notational", "procedural", "conceptual"]),
  observed_signature: z.string(),
});

export const NovelCandidateSchema = z.object({
  proposed_name: z.string(),
  evidence_step_indices: z.array(z.number().int()),
  confidence: z.number().min(0).max(1),
});

export const DiagnosisSchema = z.object({
  detected: z.array(DetectedMisconceptionSchema),
  novel_candidates: z.array(NovelCandidateSchema).default([]),
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
