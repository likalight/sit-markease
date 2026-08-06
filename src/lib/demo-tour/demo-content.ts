// Fixed IDs of the two real assessments used by the public guided demo tour:
// "Physics" (formative) and "Math" (summative) — real A-level/H2 past-paper
// questions with official/derived rubrics, trimmed to 2 questions each for a
// fast demo. Not derived dynamically since the tour needs to unambiguously
// spotlight these exact rows even when the demo student/educator also has
// other real work.
//
// Previously pointed at AI-authored "INF1003 Tutorial 1/3" content — swapped
// out after live testing repeatedly showed the Combinatorics tutorial
// triggering low-confidence script mapping and slow grading (docs/DECISIONS.md).
export const DEMO_FORMATIVE_ASSESSMENT_ID = "9bd44653-79bf-45af-a909-c0893d7fad15";
export const DEMO_SUMMATIVE_ASSESSMENT_ID = "5891668e-ad8f-4ba7-82b2-63abdb07d0cf";

// Formative has two sample scripts for the tour's revise-and-resubmit beat:
// attempt #1 is deliberately incomplete (Q1 answered, Q3 not attempted at
// all — a real, honest "ran out of time" script, not a fabricated wrong
// answer), attempt #2 is the complete, correct version.
export const DEMO_FORMATIVE_SAMPLE_SCRIPT_ATTEMPT_1 = "/demo/formative-sample-script-1.pdf";
export const DEMO_FORMATIVE_SAMPLE_SCRIPT_ATTEMPT_2 = "/demo/formative-sample-script-2.pdf";
export const DEMO_SUMMATIVE_SAMPLE_SCRIPT = "/demo/summative-sample-script.pdf";

export const DEMO_SUMMATIVE_TITLE = "Math";
