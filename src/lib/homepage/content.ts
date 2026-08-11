// Homepage copy — an Apple-product-page-style scroll story of how a
// submission actually moves through the pipeline. Each step gets its own
// distinct visual (not the same screenshot repeated four times): step 0 is
// an illustration (no live screenshot of the raw upload moment exists),
// steps 1-3 are real crops of the actual review console, each showing the
// specific panel that step is about.

export const JOURNEY_STEPS = [
  {
    label: "Submit",
    title: "Photograph it.",
    body: "Any subject with a checkable answer — math, physics, engineering, nursing dosage calculations, accounting. No scanner, no typing. A phone photo is the input.",
    image: null,
  },
  {
    label: "Read",
    title: "Every line, read for real.",
    body: "pix2text and AWS Textract each take an independent pass at the handwriting. Neither replaces the model's own read — the image stays ground truth the whole way through.",
    image: { src: "/step-read.png", width: 960, height: 1195, alt: "Reconciled transcription steps with per-step confidence" },
  },
  {
    label: "Score",
    title: "Matched to the rubric, with a confidence number attached — how sure the model is about its own read.",
    body: "Each step gets checked against the rubric criteria, backed by a live search over the module's own material (RAG). Low-confidence reads get flagged, not guessed at.",
    image: { src: "/step-score.png", width: 672, height: 896, alt: "Rubric criteria matched via RAG with point values" },
  },
  {
    label: "Teach",
    title: "Not just a mark — the exact step that went wrong.",
    body: "Feedback names the specific misconception and hands back a fresh practice question built for that exact gap, verified before it ever ships.",
    image: { src: "/step-teach.png", width: 672, height: 920, alt: "AI recommendation and the exact feedback the student will see" },
  },
];

// The Improvement loop — a second real sequence (unlike Formative vs.
// Summative, which is a comparison, not a sequence, and stays side-by-side
// per the design review). Real screenshots of the actual student pages for
// 3 of 5 steps (captured from the live app, demo student roster).
// "Reattempt" and "Improvement" stay icon-based: Reattempt's only available
// real screen (the practice-set list) shows a raw-LaTeX data-quality bug in
// one seeded question's plain-text prompt preview (a different bug than the
// mixed-content MathText fix below — that field never runs through
// MathText at all), not worth surfacing on the marketing page; Improvement
// is an aggregate concept with no single screen anyway.
export const IMPROVEMENT_LOOP_STEPS = [
  {
    label: "Attempt",
    icon: "pencil" as const,
    title: "The student tries the question for real.",
    body: "Weekly practice or a live exam — same engine either way, reading the actual handwritten or typed response.",
    image: { src: "/loop-attempt.png", width: 1754, height: 371, alt: "The student's assessment list — start or review an attempt" },
  },
  {
    label: "Feedback",
    icon: "chat" as const,
    title: "Feedback lands, named to the exact step.",
    body: "Not \"wrong\" — which line, which misconception, and why it matters.",
    image: { src: "/loop-feedback.png", width: 614, height: 1062, alt: "AI summary, rubric, and a misconception card on the student's feedback page" },
  },
  {
    label: "Targeted Practice",
    icon: "target" as const,
    title: "A fresh question, built for that exact gap.",
    body: "Retrieved from the module's own material and verified — SymPy or an LLM checks it before it ever ships.",
    image: { src: "/loop-practice.png", width: 1446, height: 184, alt: "A practice item's scaffold tag and its verified, correctly-rendered solution" },
  },
  {
    label: "Reattempt",
    icon: "refresh" as const,
    title: "Revise and resubmit — as many times as it takes.",
    body: "Every attempt is logged, not just the latest one, so an instructor can see the real trajectory.",
    image: null,
  },
  {
    label: "Improvement",
    icon: "trending-up" as const,
    title: "Weekly quizzes become a continuous learning cycle.",
    body: "The gap that showed up in week 2 is the thing week 3's practice is actually built to fix.",
    image: null,
  },
];

// Feasibility & Future Potential — every screenshot on this page up to
// here is proof of feasibility already (a real, running app), so this
// section states that explicitly rather than assuming it's obvious, plus
// the adoption pathway beyond this build. Not from the pitch deck — added
// because the hackathon's own evaluation criteria weight this at 20% and
// the page previously said nothing about it.
export const FEASIBILITY = {
  now: {
    title: "Working today, not a mockup",
    points: [
      "Every screenshot on this page is the live app — free-tier OpenAI + Gemini calls, a real Supabase backend, deployed and reachable right now.",
      "A Python/FastAPI sidecar handles OCR line-detection and symbolic answer-checking, deployed independently of the Next.js app.",
      "Confidence gating means low-certainty reads route to a human by default — it's safe to hand real submissions to today, not just a demo.",
      "Honest gap: measured against synthetic test scripts so far, not yet real handwriting at classroom scale — that's the next milestone, not a hidden one.",
    ],
  },
  next: {
    title: "Where it goes from here",
    points: [
      "Many disciplines with a checkable answer work today — expanding to more SIT modules is a rubric, not a rebuild.",
      "The same pipeline generalises to other institutions running open-ended, rubric-graded assessment at scale.",
      "Deeper LMS integration (single sign-on, gradebook sync) is the natural next step once a module adopts it for real.",
    ],
  },
};
