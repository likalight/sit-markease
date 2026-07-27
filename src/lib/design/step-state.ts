import type { StepState } from "@/components/script-viewer";

// docs/DESIGN.md §1.1 semantic mapping, applied to a solution step:
// disputed = reads disagreed (agreement below the §7.4 low threshold);
// attention = a misconception was found here; verified = reads agreed, clean.
export function stepState(agreement: number, hasMisconception: boolean): StepState {
  if (agreement < 0.6) return "disputed";
  if (hasMisconception) return "attention";
  return "verified";
}
