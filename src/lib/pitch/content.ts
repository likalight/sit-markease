// Content sourced verbatim from AIMS-pitch-deck.pdf (Group 15 proposal).
// Keep copy exact — this is a hackathon pitch, not marketing copy to riff on.

// Sets the objective before the problem/solution slides — a judge who has
// never seen this project needs the institutional context first, not a
// bare stat callout. Added per direct presentation feedback: don't jump
// straight into technical detail before the audience has the "why."
export const BACKGROUND = {
  eyebrow: "Why this exists",
  title: "SIT runs large, open-ended, hands-on modules. Grading them well doesn't scale.",
  body: "Math, physics, engineering, nursing, business, computing: every one of these modules asks students to show their working, not just pick an answer. That takes real time to grade properly, and it's hard to give timely, specific feedback at cohort scale.",
  objective: "The objective: a human makes every grading decision, and every student still gets specific, immediate feedback.",
};

export const PROBLEM_BULLETS = [
  "Manual grading can be slow & difficult to scale consistently.",
  "Students receive marks or brief annotations without thoroughly understanding their mistakes.",
  "Instructors have limited visibility into cohort-wide misconceptions.",
  "Students lack practice targeted to their specific learning gaps.",
];

export const STAT_CALLOUT = {
  value: "94.92%",
  body: "of students said feedback after a quiz was very important to them, and most wanted it quickly, not at term's end.",
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
  "Keeps instructors in control of every grading decision. AIMS suggests, it never finalises.",
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

// Labels renamed from the original Formative/Summative terminology —
// "Developmental" and "Evaluative" read plainly to a non-technical judge
// without losing the distinction. Internal code/DB values stay
// 'formative'/'summative' (src/lib/assessment-mode.ts) since renaming
// the actual enum needs a live data migration this environment can't run
// unattended.
export const DEVELOPMENTAL = {
  label: "Developmental",
  plainLabel: "Practice mode, built to teach",
  subLabel: "Weekly practice. Feedback is the whole point.",
  points: [
    "Releases instantly. No instructor gate.",
    "Student reads a guiding hint, not the answer.",
    "Student revises and resubmits freely.",
  ],
  exampleLabel: "EXAMPLE HINT",
  example: "Look again at step 2. What do you get if you substitute n=2 back into your own formula?",
  safeguard: "No reviewer. The student sees the transcription and can flag a misread.",
};

export const EVALUATIVE = {
  label: "Evaluative",
  plainLabel: "Exam mode, built to assess",
  subLabel: "Closed-book exam. The mark is what's required.",
  points: [
    "Instructor reviews every score first.",
    "Can adjust the score or transcription directly.",
    "Approves the mark before a student sees it.",
  ],
  exampleLabel: "EXAMPLE FEEDBACK (when released)",
  example:
    "Correctly differentiated in step 1, but the substitution in step 2 doesn't match your own derivative. Recheck the arithmetic.",
  safeguard: "Student never sees the raw transcription. Low-confidence reads get a visual check.",
};

// Third mode: no instructor involved at any point, not even at issue-time
// (src/app/(educator)/assignments/new/actions.ts auto-opens it and assigns
// every valid student the moment it's created). Positioned as a self-serve
// trainer, the example leans on programming/skills practice rather than a
// specific class's syllabus, since it isn't tied to one.
export const AI_MODE = {
  label: "AI",
  plainLabel: "Trainer mode, built to self-serve",
  subLabel: "No instructor, ever. Open the moment it exists.",
  points: [
    "No roster, no issue step. Open immediately.",
    "Built for open skill practice, not one class's syllabus.",
    "Every attempt still logged and verified.",
  ],
  exampleLabel: "EXAMPLE PROMPT",
  example: "Write a function that reverses a linked list in place. No extra data structures.",
  safeguard: "Same confidence gating and verification as the other two modes. No human reviewer, but not unchecked.",
};

export const REQUEST_REVISION = {
  title: "Request a practice revision set",
  body: "A search over the module's own notes finds material for exactly what was missed. OpenAI turns it into a fresh, verified question, straight into the student's practice queue.",
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
    after: "Gets a mark and a named misconception the same day, plus a fresh question built for that exact gap.",
  },
  instructor: {
    label: "For the instructor",
    before: "Spends most of the marking window decoding handwriting before any real judgment happens.",
    after: "Spends that time verifying and deciding. AIMS does the reading and rubric-matching first.",
  },
  atScale: "Multiply that by a 200-student cohort and a 12-week term. The time saved compounds every single week.",
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

