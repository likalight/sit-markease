export type TourMode = "formative" | "summative";

export type TourStep = {
  role: "student" | "educator";
  matches: (pathname: string) => boolean;
  targetTourId: string;
  title: string;
  body: string;
  // 'click-target' — no visible Next button; the spotlighted real element
  // itself is the way forward, and clicking it also advances the tour step.
  // 'button' — the tour renders its own Next/action button.
  advanceOn: "click-target" | "button";
  switchTo?: "student" | "educator";
  redirectAfterSwitch?: string;
  end?: boolean;
};

export const TOUR_ENTRY_PATH: Record<TourMode, string> = {
  formative: "/submit",
  summative: "/assignments",
};

export const TOUR_STEPS: Record<TourMode, TourStep[]> = {
  formative: [
    {
      role: "student",
      matches: (p) => p === "/submit",
      targetTourId: "submit-start-attempt",
      title: "Start a formative attempt",
      body: "This is low-stakes weekly practice — click \"Start attempt\". No waiting on an instructor, and you can repeat it.",
      advanceOn: "click-target",
    },
    {
      role: "student",
      matches: (p) => p.startsWith("/work/"),
      targetTourId: "use-sample-script",
      title: "Submit real work in one click",
      body: "For this demo, use a real handwritten script instead of taking your own photo — this runs the actual grading pipeline, not a mock.",
      advanceOn: "click-target",
    },
    {
      role: "student",
      matches: (p) => p === "/submit",
      targetTourId: "submit-review-assessment-formative",
      title: "See your feedback",
      body: "Grading already ran. Click \"Review assessment\" to see the result.",
      advanceOn: "click-target",
    },
    {
      role: "student",
      matches: (p) => p.startsWith("/feedback"),
      targetTourId: "feedback-container",
      title: "Instant, detailed feedback",
      body: "No instructor was involved in releasing this — that's the whole point of formative practice. Ready to see the instructor's side?",
      advanceOn: "button",
      switchTo: "educator",
      redirectAfterSwitch: "/review",
    },
    {
      role: "educator",
      matches: (p) => p === "/review",
      targetTourId: "review-page-body",
      title: "Formative work never needs review",
      body: "This queue only ever shows summative submissions — the practice you just did is never gated by an instructor.",
      advanceOn: "button",
      end: true,
    },
  ],
  summative: [
    {
      role: "educator",
      matches: (p) => p === "/assignments",
      targetTourId: "assignments-upload-combinatorics",
      title: "Upload the exam script",
      body: "This is the closed-book path — the instructor uploads the script, not the student. Click \"Upload a script\".",
      advanceOn: "click-target",
    },
    {
      role: "educator",
      matches: (p) => p.includes("/upload"),
      targetTourId: "use-sample-script",
      title: "Use a real sample script",
      body: "This uploads a real handwritten script covering the whole paper — the system detects question boundaries automatically.",
      advanceOn: "click-target",
    },
    {
      role: "educator",
      matches: (p) => p.includes("/scripts/") && p.includes("/mapping"),
      targetTourId: "confirm-mapping",
      title: "Confirm the question mapping",
      body: "Check which pages belong to which question, then confirm — this is what triggers real grading.",
      advanceOn: "click-target",
    },
    {
      role: "educator",
      matches: (p) => p === "/review",
      targetTourId: "review-open",
      title: "Review the queue",
      body: "Every summative submission waits here until an instructor makes a decision. Open it.",
      advanceOn: "click-target",
    },
    {
      role: "educator",
      matches: (p) => p.startsWith("/review/"),
      targetTourId: "approve-next",
      title: "Grade and approve",
      body: "Click a rubric level, or override the total, then approve. If there's more ungraded work, keep clicking Approve & next until the queue's clear.",
      advanceOn: "click-target",
    },
    {
      // Approving one submission isn't the release — a summative
      // assessment only shows results to students once every mapped
      // question has been approved and the instructor explicitly releases
      // all of them together (a separate step, on /assignments). This step
      // waits there for that real "Release all results" button rather than
      // assuming one approval was enough.
      role: "educator",
      matches: (p) => p === "/assignments",
      targetTourId: "release-all-results",
      title: "Release all results",
      body: "Once every question for this student is graded, releasing makes the result visible to them all at once — nothing shows up piecemeal.",
      advanceOn: "click-target",
      switchTo: "student",
      redirectAfterSwitch: "/submit",
    },
    {
      role: "student",
      matches: (p) => p === "/submit",
      targetTourId: "submit-review-assessment-summative",
      title: "See the released result",
      body: "Click \"Review assessment\" to see what the instructor just approved.",
      advanceOn: "click-target",
    },
    {
      role: "student",
      matches: (p) => p.startsWith("/feedback"),
      targetTourId: "feedback-container",
      title: "That's the summative loop",
      body: "Instructor-reviewed, then released — nothing skips that gate.",
      advanceOn: "button",
      end: true,
    },
  ],
};
