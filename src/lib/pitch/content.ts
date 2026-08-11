// Content sourced verbatim from AIMS-pitch-deck.pdf (Group 15 proposal).
// Keep copy exact — this is a hackathon pitch, not marketing copy to riff on.

// Sets the objective before the problem/solution slides — a judge who has
// never seen this project needs the institutional context first, not a
// bare stat callout. Added per direct presentation feedback: don't jump
// straight into technical detail before the audience has the "why."
export const BACKGROUND = {
  eyebrow: "Why this exists",
  title: "SIT runs large, open-ended, hands-on modules — and grading them well doesn't scale.",
  body: "Math, physics, engineering, nursing, business, computing — every one of these modules asks students to show their working, not just pick an answer. That's exactly the kind of response that takes real time to grade properly, and the kind that's hardest to give timely, specific feedback on at cohort scale.",
  objective: "The objective: keep a human making every grading decision, while giving every student the kind of specific, immediate feedback that today only happens when an instructor has time to write it by hand.",
};

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
    existing: "Rubric issues are only caught mid-marking, after work has already started",
    aims: "Suggests rubric refinements to the instructor before detailed submission review",
  },
];

export const FORMATIVE = {
  label: "Formative",
  plainLabel: "Practice mode — built to teach",
  subLabel: "Weekly practice, feedback is the whole point",
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
  plainLabel: "Exam mode — built to assess",
  subLabel: "Closed-book CA / final exam — the mark is what's required, not feedback",
  points: [
    "Instructor reviews, grouped by question, lowest-confidence first.",
    "Can adjust the score or the exact transcription directly.",
    "Approves the mark before anything reaches a student.",
    "Feedback release is the instructor's call — a final exam may need only the mark; a graded CA can release the same feedback formative students get.",
  ],
  exampleLabel: "EXAMPLE FEEDBACK (when released)",
  example:
    "Correctly differentiated in step 1, but the substitution in step 2 doesn't match your own derivative. Recheck the arithmetic.",
  safeguard: "Student never sees the raw transcription. Low-confidence reads are flagged for visual check.",
};

export const REQUEST_REVISION = {
  title: "Request a practice revision set",
  body: "A search over the module's own notes finds material for exactly what was missed; OpenAI turns it into a fresh, verified question that lands straight in the student's practice queue — no instructor gate, since nothing here is graded.",
};

// Explicit "anticipated impact" framing — the hackathon rubric scores this
// separately from Problem-Solution Fit, so it needs its own slide rather
// than being folded into the Impact statements above.
export const ANTICIPATED_IMPACT = {
  eyebrow: "Anticipated impact",
  title: "What changes for a student, and for an instructor.",
  student: {
    label: "For the student",
    before: "Waits days to weeks for a mark, often with no explanation of what went wrong.",
    after: "Gets a mark and a named misconception the same day — and a fresh, verified question built for exactly that gap.",
  },
  instructor: {
    label: "For the instructor",
    before: "Spends most of the marking window decoding handwriting before any actual judgment happens.",
    after: "Spends that time verifying and deciding — AIMS does the reading and the rubric-matching first.",
  },
  atScale: "Multiply either of those by a 200-student cohort and a 12-week term, and the time saved compounds every single week — not a one-off efficiency gain.",
};

// LMS integration — the natural home for AIMS once a module adopts it for
// real, not a rebuild: SIT's LMS is D2L Brightspace, and Brightspace
// already exposes exactly the two integration surfaces AIMS would need.
// Sourced from D2L's own developer documentation (Valence API + LTI 1.3
// Assignment and Grade Services), not speculative.
export const LMS_INTEGRATION = {
  eyebrow: "Where it plugs in",
  title: "Students already live in Brightspace. AIMS wouldn't be a second site to remember — it would open from inside it.",
  body: "SIT's LMS is D2L Brightspace. Brightspace already lets outside tools like AIMS plug in officially, in three ways:",
  points: [
    {
      title: "One click in, already signed in",
      tech: "LTI 1.3 single sign-on",
      body: "A student clicks the assignment inside Brightspace, same as any other. It opens AIMS directly — no separate account to create, no separate password to remember.",
    },
    {
      title: "The mark writes itself back",
      tech: "Grade sync",
      body: "Once an instructor approves a mark in AIMS, it appears in the Brightspace gradebook automatically — nobody re-types scores from one system into another.",
    },
    {
      title: "Class lists, already there",
      tech: "Roster sync",
      body: "AIMS already knows who's enrolled in the module and which section they're in, pulled straight from Brightspace — no separate spreadsheet to upload.",
    },
  ],
  note: "This is a plug-in, not a rebuild: AIMS is already built so every outside connection (each AI provider, for example) goes through one swappable adapter. Brightspace would just be one more adapter.",
  source: "docs.valence.desire2learn.com — D2L Brightspace Developer Platform",
};

