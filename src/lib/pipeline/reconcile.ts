import type { TranscriptionRead } from "@/lib/schemas/transcription";

// §7.4 S3 — was cross-read reconciliation between two independent AI reads;
// now a single model reads once, so there's nothing to reconcile against.
// Trust instead comes from the model's own reported per-step confidence and
// overall_legibility, same thresholds as before (docs/DECISIONS.md — the
// official brief never required two independent AI reads, only "multimodal
// LLMs" as a technology).

export interface AssessedStep {
  step_index: number;
  line_indices: number[];
  latex: string;
  plain_text: string;
  role: string;
  confidence: number;
  agreement: number;
  source: "reconciled";
}

export interface AssessReadResult {
  steps: AssessedStep[];
  transcription_agreement: number;
  routing: "reconciled" | "needs_human_review" | "needs_human_transcription";
}

export async function assessRead(read: TranscriptionRead, confidenceThreshold = 0.85): Promise<AssessReadResult> {
  const steps: AssessedStep[] = read.steps.map((s) => ({
    step_index: s.step_index,
    line_indices: s.line_indices,
    latex: s.latex,
    plain_text: s.plain_text,
    role: s.role,
    confidence: s.confidence,
    agreement: s.confidence,
    source: "reconciled" as const,
  }));

  const totalWeight = steps.reduce((sum, s) => sum + Math.max(s.latex.length, 1), 0);
  const weightedConfidence =
    totalWeight > 0
      ? steps.reduce((sum, s) => sum + s.confidence * Math.max(s.latex.length, 1), 0) / totalWeight
      : 1.0;

  let routing: AssessReadResult["routing"];
  if (read.overall_legibility < 0.5) {
    routing = "needs_human_transcription";
  } else if (weightedConfidence < 0.6) {
    routing = "needs_human_transcription";
  } else if (weightedConfidence < confidenceThreshold || read.overall_legibility < confidenceThreshold) {
    routing = "needs_human_review";
  } else {
    routing = "reconciled";
  }

  return { steps, transcription_agreement: weightedConfidence, routing };
}
