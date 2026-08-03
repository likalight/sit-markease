"use client";

import { useState } from "react";

interface Step {
  title: string;
  short: string;
  detail: string;
}

const STUDENT_STEPS: Step[] = [
  {
    title: "Submit your work",
    short: "Photograph or upload your handwritten answer, yourself.",
    detail:
      "No waiting on a teacher to scan or upload anything on your behalf. Open SIT MarkEase, take a photo or upload a file, and it's already on its way to being graded.",
  },
  {
    title: "An AI reads it",
    short: "It rates its own confidence on every step, not just a final guess.",
    detail:
      "A multimodal model transcribes your work line by line and reports how legible and confident it is at each step — that self-reported confidence, not a blind guess, is what decides whether your grade is safe to release automatically.",
  },
  {
    title: "The answer is verified",
    short: "Checked for real, not just \"looks about right.\"",
    detail:
      "Wherever the final answer is a checkable calculation, it's confirmed the same way a calculator would — deterministically, not based on an AI's impression of whether it looks correct.",
  },
  {
    title: "Most of the time, you're done in seconds",
    short: "Confident, verified results release immediately.",
    detail:
      "If the read is confident and the answer checks out symbolically, there's no queue, no waiting for a teacher — your mark and feedback are ready right away.",
  },
  {
    title: "You see exactly where it broke down",
    short: "Not just a number — the specific step, in plain English.",
    detail:
      "Your own script, with the exact line that went wrong highlighted, plus a plain-language explanation of what happened there and why it matters — alongside a named misconception, not a generic \"incorrect.\"",
  },
  {
    title: "You practice the actual gap",
    short: "Built for your specific mistake, ramped up in difficulty.",
    detail:
      "A short set of problems — scaffold, then target, then extension — targeting the exact misconception you showed, every one of them verified correct before you ever see it. There's also an exam-prep mode that combines every gap you've shown across a whole module into one revision set.",
  },
];

const EDUCATOR_STEPS: Step[] = [
  {
    title: "Set up the question once",
    short: "Attach a rubric and a misconception taxonomy.",
    detail:
      "Write the question, the rubric criteria, and the common misconceptions you already know students hit on this topic. Students then submit against it directly — you're not the intake point.",
  },
  {
    title: "Most submissions never reach you",
    short: "Confident, verified results release on their own.",
    detail:
      "Every submission still goes through the exact same rubric-graded, symbolically-verified pipeline. The ones where the read is confident and the maths checks out just release automatically, with a full audit trail either way.",
  },
  {
    title: "Only the uncertain ones land in your queue",
    short: "Sorted lowest-confidence-first.",
    detail:
      "Low-confidence transcription, illegible handwriting, or an ambiguous misconception — these are the only submissions that ever ask for your attention, and they're sorted so the ones that need it most come first.",
  },
  {
    title: "Review in three panes",
    short: "The photo, the transcription, and the evidence — together.",
    detail:
      "The original photo with every line boxed and colour-coded by agreement, the reconciled step-by-step transcription with per-step confidence, and criterion cards citing exactly which step justifies each mark. Adjust and approve with a keyboard, if you want.",
  },
  {
    title: "Approving releases it",
    short: "Nothing reaches a student without this.",
    detail:
      "Approval writes the final grade and an audit log entry — who approved it, when, and whether it was adjusted. This is the one explicit human action nothing can skip.",
  },
  {
    title: "See the whole class, not one script",
    short: "Which students need help, and with what.",
    detail:
      "A dashboard of every question you've issued and how it's going, plus a class-wide view of which misconceptions are showing up most — so you know what to actually re-teach, not just who to re-mark.",
  },
];

export function JourneyExplorer() {
  const [role, setRole] = useState<"student" | "educator">("student");
  const [activeStep, setActiveStep] = useState(0);
  const steps = role === "student" ? STUDENT_STEPS : EDUCATOR_STEPS;

  function selectRole(next: "student" | "educator") {
    setRole(next);
    setActiveStep(0);
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="mx-auto flex gap-xs rounded-pill border border-hairline p-[3px]">
        <button
          onClick={() => selectRole("student")}
          className={`rounded-pill px-lg py-xs text-body-sm font-medium transition-colors ${
            role === "student" ? "bg-ink text-on-dark" : "text-muted"
          }`}
        >
          I'm a student
        </button>
        <button
          onClick={() => selectRole("educator")}
          className={`rounded-pill px-lg py-xs text-body-sm font-medium transition-colors ${
            role === "educator" ? "bg-ink text-on-dark" : "text-muted"
          }`}
        >
          I'm an educator
        </button>
      </div>

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-[280px_1fr]">
        <ol className="flex flex-row gap-xs overflow-x-auto sm:flex-col sm:gap-xs sm:overflow-visible">
          {steps.map((step, i) => (
            <li key={step.title} className="shrink-0 sm:shrink">
              <button
                onClick={() => setActiveStep(i)}
                className={`flex w-full items-start gap-sm rounded-sm border px-sm py-xs text-left transition-colors ${
                  activeStep === i
                    ? "border-primary bg-primary-soft"
                    : "border-hairline hover:bg-surface-soft"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-caption-caps ${
                    activeStep === i ? "bg-primary text-on-primary" : "border border-hairline text-muted-soft"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-[10rem] text-body-sm text-body-strong sm:min-w-0">{step.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="rounded-lg border border-hairline p-lg">
          <p className="mb-xxs text-caption-caps text-muted-soft">
            Step {activeStep + 1} of {steps.length}
          </p>
          <h3 className="mb-xs font-serif text-display-sm text-ink">{steps[activeStep].title}</h3>
          <p className="mb-sm text-body-md font-medium text-body-strong">{steps[activeStep].short}</p>
          <p className="text-body-md text-muted">{steps[activeStep].detail}</p>
          <div className="mt-lg flex items-center justify-between border-t border-hairline pt-sm">
            <button
              onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
              disabled={activeStep === 0}
              className="text-body-sm text-body underline disabled:opacity-30"
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={activeStep === steps.length - 1}
              className="text-body-sm text-body underline disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
