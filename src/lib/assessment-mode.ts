// Single source of truth for assessment-mode display labels. The stored
// DB/internal values stay 'formative' | 'summative' | 'ai' — renaming the
// actual enum would mean a live data migration on every existing row,
// which isn't safe to run unattended right before a demo (no direct DB
// access in this environment, only REST keys — see docs/DECISIONS.md).
// What actually matters for "renamed everywhere" is what a person reads,
// so every user-facing label goes through this map instead of being
// hardcoded per-file.
export type AssessmentMode = "formative" | "summative" | "ai";

export const ASSESSMENT_MODE_LABEL: Record<AssessmentMode, string> = {
  formative: "Developmental",
  summative: "Evaluative",
  ai: "AI",
};

export function assessmentModeLabel(mode: string | null | undefined): string {
  return ASSESSMENT_MODE_LABEL[mode as AssessmentMode] ?? mode ?? "Evaluative";
}

// 'formative' (Developmental) and 'ai' (AI trainer) share every release
// mechanic that matters — instant auto-release, no instructor gate,
// student-initiated attempts, revise-and-resubmit. Only their labeling,
// roster handling, and intended use differ. Every place that gates
// *behavior* (not just a display label) on assessment_mode should check
// this instead of a bare === "formative", so 'ai' mode doesn't silently
// inherit summative's instructor-gated behavior by omission.
export function isSelfServeMode(mode: string | null | undefined): boolean {
  return mode === "formative" || mode === "ai";
}
