import { sidecar } from "@/lib/sidecar/client";
import type { ReadA, ReadB } from "@/lib/schemas/transcription";

// §7.4 S3 — Reconciliation. Deterministic code + one sidecar call, not a
// model call. Not implemented as an LLM stage per the PRD.

export interface ReconciledStep {
  step_index: number;
  line_indices: number[];
  latex: string;
  plain_text: string;
  role: string;
  confidence: number;
  agreement: number;
  source: "reconciled";
}

export interface ReconcileResult {
  steps: ReconciledStep[];
  transcription_agreement: number;
  routing: "reconciled" | "needs_human_review" | "needs_human_transcription";
}

// §7.4 step 1: normalise whitespace, \frac vs /, \cdot vs *, \left\right, brackets.
export function normalizeLatex(input: string): string {
  return input
    .replace(/\\left|\\right/g, "")
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/[[\](){}]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

async function stepAgreement(aText: string, bText: string): Promise<number> {
  const normA = normalizeLatex(aText);
  const normB = normalizeLatex(bText);
  if (normA === normB) return 1.0;

  try {
    const result = await sidecar.mathEquivalent(aText, bText);
    if (result.parsed) return result.equivalent ? 0.95 : 0.0;
  } catch {
    // sidecar unreachable — fall through to the text-similarity fallback
    // rather than crash (CLAUDE.md rule 8).
  }

  return levenshteinRatio(normA, normB);
}

export async function reconcile(
  readA: ReadA,
  readB: ReadB,
  agreementThreshold = 0.85
): Promise<ReconcileResult> {
  const linesByIndex = new Map(readA.lines.map((l) => [l.line_index, l]));

  const steps: ReconciledStep[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const step of readB.steps) {
    const aText = step.line_indices
      .map((idx) => linesByIndex.get(idx)?.latex ?? "")
      .join(" ");
    const bText = step.latex;

    const agreement = await stepAgreement(aText, bText);
    const weight = Math.max(bText.length, 1);
    weightedSum += agreement * weight;
    totalWeight += weight;

    steps.push({
      step_index: step.step_index,
      line_indices: step.line_indices,
      latex: step.latex,
      plain_text: step.plain_text,
      role: step.role,
      confidence: step.confidence,
      agreement,
      source: "reconciled",
    });
  }

  const transcriptionAgreement = totalWeight > 0 ? weightedSum / totalWeight : 1.0;

  let routing: ReconcileResult["routing"];
  if (readA.overall_legibility < 0.5) {
    routing = "needs_human_transcription";
  } else if (transcriptionAgreement < 0.6) {
    routing = "needs_human_transcription";
  } else if (transcriptionAgreement < agreementThreshold) {
    routing = "needs_human_review";
  } else {
    routing = "reconciled";
  }

  return { steps, transcription_agreement: transcriptionAgreement, routing };
}
