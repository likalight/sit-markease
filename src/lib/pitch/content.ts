// Content sourced verbatim from AIMS-pitch-deck.pdf (Group 15 proposal).
// Keep copy exact — this is a hackathon pitch, not marketing copy to riff on.

export const PROBLEM_BULLETS = [
  "Manual grading can be slow & difficult to scale consistently.",
  "Students receive marks or brief annotations without thoroughly understanding their mistakes.",
  "Instructors have limited visibility into cohort-wide misconceptions.",
  "Students lack practice targeted to their specific learning gaps.",
];

export const STAT_CALLOUT = {
  value: "94.92%",
  body: "of students said feedback after a quiz was very important to them — and the majority wanted it in a timely manner, not at term's end.",
  citation: "Edokpayi, J. N. (2025). Assessing the impact of frequent quizzes on student performance. Discover Education, 4(480).",
};

// Trimmed to avoid restating what the Journey section already shows, but
// keeps every component named in the official "Proposed AI Solution" text
// (OCR + handwriting recognition, multimodal LLMs, rubric-aligned feedback,
// misconception detection, automated scoring, RAG-based practice) — graded
// under Problem-Solution Fit (30%), so completeness matters more than
// brevity here.
export const SOLUTION_BULLETS = [
  "Takes both handwritten and typed/digital responses as input.",
  "Detects misconceptions and valid alternative approaches, not just right/wrong.",
  "Keeps instructors in control of every grading decision — AIMS suggests, it never finalises.",
];

// Restored the workload-reduction statement — it maps directly to the
// official "Expected Impact" text ("reduces assessment workload") and is a
// distinct claim from the Journey's "Teach" step (which is about the
// student's experience, not the instructor's time).
export const IMPACT_STATEMENTS = [
  {
    title: "Streamlined, accelerated marking",
    body: "AIMS takes on the cognitive work of reading each response and mapping it to the rubric, so the instructor's time goes to verifying and assigning the mark — not decoding the handwriting first.",
  },
  {
    title: "Improved mastery",
    body: "Transforms weekly quizzes into a continuous learning cycle — attempt, feedback, targeted practice, reattempt, improvement.",
  },
];

export const COMPARISON_ROWS = [
  {
    existing: "Streamlines rubric-based marking",
    aims: "Supports marking for instructors AND targeted learning for students",
  },
  {
    existing: "Feedback depends largely on manual comments",
    aims: "Automatically drafts misconception-specific feedback",
  },
  {
    existing: "Provides general assignment results",
    aims: "Identifies personalised individual & cohort learning gaps and provides targeted practice questions",
  },
  {
    existing: "Ends after grades are released",
    aims: "Connects mistakes to targeted practice",
  },
  {
    existing: "Rubrics are adjusted as the instructor is marking submissions",
    aims: "Suggests rubric refinements to the instructor before detailed submission review",
  },
];

export const FORMATIVE = {
  label: "Formative",
  subLabel: "Weekly practice",
  points: [
    "Releases instantly. No instructor gate, no confidence check.",
    "Student reads a guiding hint, not the answer.",
    "Student revises and resubmits the same question.",
    "Every attempt is logged, not just the latest one.",
    "Instructor or TA can review engagement anytime, unhurried.",
  ],
  exampleLabel: "EXAMPLE HINT",
  example: "Look again at step 2. What do you get if you substitute n=2 back into your own formula?",
  safeguard: "With no reviewer, the check is the student: they see the transcription and can flag a misread.",
};

export const SUMMATIVE = {
  label: "Summative",
  subLabel: "Closed-book CA / exam",
  points: [
    "Instructor reviews, grouped by question, lowest-confidence first.",
    "Can adjust the score or the exact transcription directly.",
    "Approves the mark and the exact feedback text.",
    "Score and feedback released to the student.",
  ],
  exampleLabel: "EXAMPLE FEEDBACK",
  example:
    "Correctly differentiated in step 1, but the substitution in step 2 doesn't match your own derivative. Recheck the arithmetic.",
  safeguard: "Student never sees the raw transcription. Low-confidence reads are flagged for visual check.",
};

export const REQUEST_REVISION = {
  title: "Request a practice revision set",
  body: "RAG finds material for exactly what was missed; OpenAI turns it into a fresh, verified question that lands straight in the student's practice queue — no instructor gate, since nothing here is graded.",
};

