// §3.3 / §14 — metrics computed from a completed gold-set run. Pure
// functions over already-persisted pipeline output; eval/run.ts drives the
// pipeline and calls these.

export interface GoldResult {
  goldId: string;
  submissionId: string;
  humanTotal: number;
  aiTotal: number | null;
  maxTotal: number;
  transcriptionAgreement: number | null;
  overallLegibility: number | null;
  needsHumanReview: boolean | null;
  symbolicCheck: string | null;
  expectedMisconceptions: string[];
  detectedMisconceptions: string[];
  reviewSeconds: number | null;
}

export function scoreMAE(results: GoldResult[]): number | null {
  const scored = results.filter((r) => r.aiTotal !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, r) => acc + Math.abs(r.aiTotal! - r.humanTotal), 0);
  return sum / scored.length;
}

// Quadratic Weighted Kappa. Meaningful with a real N (§3.3 target is on a
// 20-script gold set); with n=3 this is closer to a formula demonstration
// than a statistically meaningful number — reported with that caveat.
export function quadraticWeightedKappa(a: number[], b: number[], maxScore: number): number | null {
  if (a.length !== b.length || a.length === 0) return null;
  const n = maxScore + 1;
  const hist = (arr: number[]) => {
    const h = new Array(n).fill(0);
    for (const v of arr) h[Math.round(v)] += 1;
    return h;
  };
  const histA = hist(a);
  const histB = hist(b);
  const total = a.length;

  const weights: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => ((i - j) ** 2) / ((n - 1) ** 2)));

  const observed: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < a.length; i++) {
    observed[Math.round(a[i])][Math.round(b[i])] += 1;
  }

  const expected: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (histA[i] * histB[j]) / total)
  );

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      numerator += weights[i][j] * observed[i][j];
      denominator += weights[i][j] * expected[i][j];
    }
  }
  if (denominator === 0) return null;
  return 1 - numerator / denominator;
}

export function misconceptionPrecisionRecall(results: GoldResult[]): { precision: number | null; recall: number | null } {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const r of results) {
    for (const detected of r.detectedMisconceptions) {
      if (r.expectedMisconceptions.includes(detected)) truePositives += 1;
      else falsePositives += 1;
    }
    for (const expected of r.expectedMisconceptions) {
      if (!r.detectedMisconceptions.includes(expected)) falseNegatives += 1;
    }
  }

  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : null;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : null;
  return { precision, recall };
}

export function rate(results: GoldResult[], predicate: (r: GoldResult) => boolean): number {
  if (results.length === 0) return 0;
  return results.filter(predicate).length / results.length;
}

export function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
