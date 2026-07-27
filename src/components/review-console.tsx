"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Box {
  lineIndex: number;
  box: { x: number; y: number; w: number; h: number };
}

interface Step {
  stepIndex: number;
  lineIndices: number[];
  plainText: string;
  latex: string;
  role: string;
  confidence: number;
  agreement: number;
}

interface Criterion {
  criterionKey: string;
  level: string;
  score: number;
  maxScore: number;
  evidenceStepIndices: number[];
  justification: string;
  confidence: number;
}

export function ReviewConsole(props: {
  submissionId: string;
  questionPromptText: string;
  originalUrl: string | null;
  boxes: Box[];
  steps: Step[];
  criteria: Criterion[];
  rubricCriteria: { key: string; name: string }[];
  needsHumanReview: boolean;
  totalRecommended: number;
  maxTotal: number;
  nextSubmissionId: string | null;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(props.criteria.map((c) => [c.criterionKey, c.score]))
  );
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mountedAt = useRef(Date.now());
  const firstScoreInputRef = useRef<HTMLInputElement | null>(null);
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const nameByKey = Object.fromEntries(props.rubricCriteria.map((c) => [c.key, c.name]));
  const adjusted = props.criteria.some((c) => scores[c.criterionKey] !== c.score);
  const currentTotal = Object.values(scores).reduce((a, b) => a + b, 0);

  function scrollToStep(stepIndex: number) {
    setSelectedStep(stepIndex);
    stepRefs.current[stepIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function approveAndAdvance() {
    if (submitting) return;
    setSubmitting(true);
    const reviewSeconds = Math.round((Date.now() - mountedAt.current) / 1000);
    try {
      const res = await fetch(`/api/submissions/${props.submissionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalScore: currentTotal,
          adjusted,
          reviewSeconds,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(props.nextSubmissionId ? `/review/${props.nextSubmissionId}` : "/review");
    } finally {
      setSubmitting(false);
    }
  }

  function skip() {
    router.push(props.nextSubmissionId ? `/review/${props.nextSubmissionId}` : "/review");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        approveAndAdvance();
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        firstScoreInputRef.current?.focus();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        skip();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTotal, adjusted, submitting]);

  return (
    <div className="grid h-screen grid-cols-[1fr_1fr_1fr]">
      {/* Left: original script with line overlays */}
      <div className="overflow-auto border-r border-neutral-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Original script</h2>
        {props.originalUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.originalUrl} alt="original submission" className="block max-w-full" />
            {props.boxes.map((b) => {
              const highlighted = props.steps.some(
                (s) => s.stepIndex === selectedStep && s.lineIndices.includes(b.lineIndex)
              );
              return (
                <div
                  key={b.lineIndex}
                  className={`absolute border-2 ${highlighted ? "border-amber-500 bg-amber-400/20" : "border-red-500/60"}`}
                  style={{
                    left: `${b.box.x * 100}%`,
                    top: `${b.box.y * 100}%`,
                    width: `${b.box.w * 100}%`,
                    height: `${b.box.h * 100}%`,
                  }}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No image available.</p>
        )}
      </div>

      {/* Centre: numbered steps */}
      <div className="overflow-auto border-r border-neutral-200 p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Reconciled steps</h2>
        <p className="mb-3 text-xs text-neutral-400">{props.questionPromptText}</p>
        <div className="flex flex-col gap-3">
          {props.steps.map((s) => (
            <div
              key={s.stepIndex}
              ref={(el) => {
                stepRefs.current[s.stepIndex] = el;
              }}
              onClick={() => scrollToStep(s.stepIndex)}
              className={`cursor-pointer rounded border px-3 py-2 text-sm ${
                selectedStep === s.stepIndex ? "border-amber-500 bg-amber-50" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Step {s.stepIndex}</span>
                <span>
                  conf {(s.confidence * 100).toFixed(0)}% · agree {(s.agreement * 100).toFixed(0)}%
                </span>
              </div>
              <p>{s.plainText}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: criterion cards + approve */}
      <div className="flex flex-col overflow-auto p-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Recommendation</h2>
        {props.needsHumanReview && (
          <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">Flagged for human review.</p>
        )}
        <div className="flex flex-col gap-3">
          {props.criteria.map((c, i) => (
            <div key={c.criterionKey} className="rounded border border-neutral-200 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{nameByKey[c.criterionKey] ?? c.criterionKey}</span>
                <span className="text-xs text-neutral-400">{c.level} · conf {(c.confidence * 100).toFixed(0)}%</span>
              </div>
              <p className="mb-2 text-xs text-neutral-600">{c.justification}</p>
              <div className="mb-2 flex flex-wrap gap-1">
                {c.evidenceStepIndices.map((idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToStep(idx)}
                    className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
                  >
                    step {idx}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                Score
                <input
                  ref={i === 0 ? firstScoreInputRef : undefined}
                  type="number"
                  min={0}
                  max={c.maxScore}
                  value={scores[c.criterionKey]}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [c.criterionKey]: Number(e.target.value) }))
                  }
                  className="w-16 rounded border border-neutral-300 px-2 py-1"
                />
                / {c.maxScore}
              </label>
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <p className="text-sm">
            Total: <strong>{currentTotal}</strong> / {props.maxTotal}
            {adjusted && <span className="ml-2 text-xs text-amber-600">adjusted</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={approveAndAdvance}
              disabled={submitting}
              className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve &amp; next <span className="opacity-60">(A)</span>
            </button>
            <button onClick={() => firstScoreInputRef.current?.focus()} className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Adjust <span className="opacity-60">(J)</span>
            </button>
            <button onClick={skip} className="rounded border border-neutral-300 px-3 py-2 text-sm">
              Skip <span className="opacity-60">(S)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
