"use client";

import { useState } from "react";

const STEPS = [
  { label: "Photo or PDF", detail: "Submit straight from your phone." },
  { label: "AI reads it", detail: "Line by line, with a confidence score." },
  { label: "Answer verified", detail: "Checked for real, like a calculator." },
  { label: "Grade + feedback", detail: "The exact step that broke, in seconds." },
];

const ICONS = [
  // camera
  <path key="camera" d="M9 8l1.5-2h3L15 8h3a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V9a1 1 0 011-1h3z" />,
  // eye
  <path key="eye" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zm10 3a3 3 0 100-6 3 3 0 000 6z" />,
  // check-shield
  <path key="check" d="M12 2l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V5l8-3zm-1.2 12.8L15.5 10l-1.4-1.4-3.3 3.3-1.4-1.4L8 12l2.8 2.8z" />,
  // doc
  <path key="doc" d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zm7 1.5V8h3.5L14 4.5z" />,
];

// A visual, clickable replacement for a plain 4-column text list — shapes +
// motion instead of paragraphs, per the "not too wordy, more interactive"
// request. Purely decorative/explanatory; no real pipeline call happens
// here.
export function PipelineFlow() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-lg">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-hairline" aria-hidden />
        <div
          className="absolute top-1/2 h-px bg-primary transition-all duration-500"
          style={{ left: 0, width: `${(active / (STEPS.length - 1)) * 100}%` }}
          aria-hidden
        />
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setActive(i)}
            className="relative z-10 flex flex-col items-center gap-xs"
            aria-label={s.label}
          >
            <span
              className={`flex h-14 w-14 rotate-3 items-center justify-center rounded-lg border-2 transition-colors ${
                i === active
                  ? "border-primary bg-primary text-on-primary"
                  : i < active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-hairline bg-surface text-muted-soft"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 -rotate-3">
                {ICONS[i]}
              </svg>
            </span>
            <span
              className={`hidden text-caption-caps sm:block ${i === active ? "text-body-strong" : "text-muted-soft"}`}
            >
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-hairline bg-surface-soft px-lg py-md text-center">
        <p className="text-title-sm text-body-strong sm:hidden">{STEPS[active].label}</p>
        <p className="text-body-md text-muted">{STEPS[active].detail}</p>
      </div>
    </div>
  );
}
