"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ScriptViewer, type ScriptViewerBox } from "./script-viewer";
import { ConfidenceBar } from "./confidence-bar";
import { MathText } from "./math";
import { FeedbackFlagButton } from "./feedback-flag-button";
import { OcrStepFlagButton } from "./ocr-step-flag-button";
import { stepState } from "@/lib/design/step-state";

interface Step {
  stepIndex: number;
  latex: string;
  plainText: string;
  confidence: number;
  agreement: number;
  hasMisconception: boolean;
}

interface Criterion {
  name: string;
  score: number;
  maxScore: number;
  evidenceStepIndices: number[];
}

// Read-only mirror of the instructor's review-console.tsx layout (§DESIGN
// per user request): same three-column shape — original script, parsed
// steps, verdict — so a student reads their own work the same way an
// instructor reviewed it, not a flattened summary. No editing controls;
// everything here is already approved/released.
export function StudentFeedbackConsole(props: {
  questionPosition: number | null;
  questionPrompt: string;
  total: number;
  maxTotal: number;
  originalUrl: string | null;
  partBoxes: ScriptViewerBox[];
  steps: Step[];
  criteria: Criterion[];
  summary: string;
  strengths: { text: string; step_indices: number[] }[];
  breakdownPoints: { step_index: number; what_happened: string; why_it_matters: string }[];
  misconceptions: { name: string; severity: string; observedSignature: string; remediationNote: string }[];
  nextAction: string;
  feedbackId: string;
  isFormative: boolean;
  submissionId: string;
}) {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  function scrollToStep(idx: number) {
    setSelectedStep(idx);
    stepRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const criterionNameByStep = new Map<number, string>();
  for (const c of props.criteria) {
    for (const idx of c.evidenceStepIndices) {
      criterionNameByStep.set(idx, criterionNameByStep.has(idx) ? `${criterionNameByStep.get(idx)}, ${c.name}` : c.name);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-hairline">
      <div className="flex items-center justify-between border-b border-hairline bg-surface-dark px-lg py-xs">
        <span className="font-mono text-caption-caps text-on-dark">
          {props.questionPosition ? `Question ${props.questionPosition}` : "Question"}
        </span>
        <span className="font-mono text-caption tabular-nums text-on-dark-soft">
          {props.total}/{props.maxTotal}
        </span>
      </div>

      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        {/* Left: original script, same ruled backdrop and part-box overlay
            as the instructor's console — clicking a part jumps to its step. */}
        <div
          className="overflow-auto border-b border-hairline p-lg lg:border-b-0 lg:border-r"
          style={{
            backgroundImage:
              "repeating-linear-gradient(var(--color-canvas) 0px, var(--color-canvas) 27px, var(--color-hairline-soft) 28px)",
          }}
        >
          <h2 className="mb-sm font-mono text-caption-caps text-muted-soft">Your script</h2>
          {props.originalUrl ? (
            <ScriptViewer
              imageUrl={props.originalUrl}
              boxes={props.partBoxes}
              activeKeys={activeKeys}
              onBoxClick={(key) => {
                setActiveKeys(new Set([key]));
                const group = props.partBoxes.find((b) => b.key === key);
                const firstStep = props.steps.find((s) =>
                  (criterionNameByStep.get(s.stepIndex) ? true : false)
                );
                void group;
                if (firstStep) scrollToStep(firstStep.stepIndex);
              }}
            />
          ) : (
            <p className="text-body-sm text-muted-soft">No image available.</p>
          )}
        </div>

        {/* Centre: transcribed steps, the same reconciled read the
            instructor graded from — not a re-summarized version of it. */}
        <div className="overflow-auto border-b border-hairline p-lg lg:border-b-0 lg:border-r">
          <h2 className="mb-sm font-mono text-caption-caps text-muted-soft">Transcribed steps</h2>
          <p className="mb-md text-caption text-muted-soft">{props.questionPrompt}</p>
          {props.steps.length === 0 ? (
            <p className="text-body-sm text-muted-soft">No transcription available.</p>
          ) : (
            <div className="flex flex-col gap-xs">
              {props.steps.map((s) => {
                const state = stepState(s.agreement, s.hasMisconception);
                const railColor =
                  state === "verified" ? "bg-verified" : state === "attention" ? "bg-attention" : "bg-disputed";
                return (
                  <div
                    key={s.stepIndex}
                    ref={(el) => {
                      stepRefs.current[s.stepIndex] = el;
                    }}
                    onClick={() => scrollToStep(s.stepIndex)}
                    className={`flex min-h-11 cursor-pointer gap-sm rounded-sm border px-sm py-xs ${
                      selectedStep === s.stepIndex ? "border-hairline bg-surface-soft" : "border-transparent"
                    }`}
                  >
                    <div className={`w-[3px] shrink-0 rounded-pill ${railColor}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-caption text-muted-soft">
                        <span className="flex items-center gap-xs tabular-nums">
                          Step {s.stepIndex}
                          {criterionNameByStep.has(s.stepIndex) && (
                            <span className="rounded-pill border border-hairline px-xs py-[1px] text-caption-caps text-muted">
                              {criterionNameByStep.get(s.stepIndex)}
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums">conf {(s.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-body-sm text-body">
                        <MathText latex={s.latex} />
                      </p>
                      <p className="text-caption text-muted">{s.plainText}</p>
                      <div className="mt-xs w-24">
                        <ConfidenceBar value={s.confidence} />
                      </div>
                      {props.isFormative && (
                        <div className="mt-xs">
                          <OcrStepFlagButton feedbackId={props.feedbackId} stepIndex={s.stepIndex} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: the verdict — same shape as the instructor's rubric
            panel (criterion checklist, AI summary), but read-only and
            phrased for the student instead of the marker. */}
        <div className="flex flex-col overflow-auto p-lg">
          <h2 className="mb-sm font-mono text-caption-caps text-muted-soft">Feedback</h2>

          <div className="mb-sm flex items-start gap-xs rounded-sm bg-primary-soft px-sm py-xs">
            <span className="mt-[1px] shrink-0 rounded-sm bg-primary px-xs py-[1px] font-mono text-caption-caps text-on-primary">
              AI Summary
            </span>
            <p className="text-body-sm text-body">{props.summary}</p>
          </div>

          <p className="mb-xs font-mono text-caption-caps text-muted-soft">Rubric</p>
          <div className="flex flex-col border-t border-hairline">
            {props.criteria.map((c, i) => {
              const fill = c.score / c.maxScore;
              return (
                <div key={i} className="flex items-start gap-sm border-b border-hairline px-xs py-sm">
                  <div
                    className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border-2 border-hairline"
                    style={
                      fill >= 1
                        ? { backgroundColor: "var(--color-primary)" }
                        : fill > 0
                          ? {
                              backgroundImage:
                                "repeating-linear-gradient(135deg, var(--color-primary), var(--color-primary) 3px, transparent 3px, transparent 6px)",
                            }
                          : undefined
                    }
                  >
                    {fill >= 1 && <span className="text-caption text-on-primary">✓</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-title-sm font-semibold text-body-strong">{c.name}</span>
                    <div className="mt-xxs flex flex-wrap gap-xxs">
                      {c.evidenceStepIndices.map((idx) => (
                        <button
                          key={idx}
                          onClick={() => scrollToStep(idx)}
                          className="rounded-pill bg-surface-card px-xs py-[1px] text-caption text-body"
                        >
                          Step {idx}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-title-sm font-bold tabular-nums text-primary-active">
                    +{c.score}
                  </span>
                </div>
              );
            })}
          </div>

          {props.misconceptions.length > 0 && (
            <div className="mt-sm rounded-lg bg-attention-soft p-sm">
              <p className="text-caption-caps text-attention">Misconception cards</p>
              {props.misconceptions.map((m, i) => (
                <div key={i} className="mt-xs">
                  <p className="text-body-sm text-body">
                    {m.name} <span className="text-caption text-muted-soft">({m.severity})</span>
                  </p>
                  <p className="text-caption text-muted">{m.observedSignature}</p>
                  {m.remediationNote && (
                    <details className="mt-xxs">
                      <summary className="cursor-pointer text-caption text-muted-soft">Why this matters</summary>
                      <p className="mt-xxs text-caption text-muted">{m.remediationNote}</p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {props.strengths.length > 0 && (
            <div className="mt-sm">
              <p className="font-mono text-caption-caps text-muted-soft">What went well</p>
              <ul className="mt-xs list-disc pl-5 text-body-sm text-body">
                {props.strengths.map((s, i) => (
                  <li key={i}>
                    <button onClick={() => scrollToStep(s.step_indices[0])} className="text-left underline decoration-dotted">
                      {s.text}
                    </button>{" "}
                    <span className="text-muted-soft">(step {s.step_indices.join(", ")})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {props.breakdownPoints.length > 0 && (
            <div className="mt-sm">
              <p className="font-mono text-caption-caps text-muted-soft">Where it broke down</p>
              <ul className="mt-xs flex flex-col gap-xs">
                {props.breakdownPoints.map((b, i) => (
                  <li
                    key={i}
                    onClick={() => scrollToStep(b.step_index)}
                    className="cursor-pointer rounded-sm border-l-[3px] border-l-attention bg-attention-soft px-sm py-xs"
                  >
                    <p className="text-caption-caps text-muted-soft">Step {b.step_index}</p>
                    <p className="text-body-sm text-body">{b.what_happened}</p>
                    <p className="text-caption text-muted">{b.why_it_matters}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-xs border-t border-hairline pt-md">
            <p className="text-body-sm text-body">
              <strong className="text-body-strong">Next: </strong>
              {props.nextAction}
            </p>
            <div className="flex flex-wrap items-center gap-md pt-xs">
              {props.isFormative && (
                <Link href="/submit" className="text-body-sm text-body underline">
                  Revise and resubmit →
                </Link>
              )}
              <Link href="/exam-prep" data-tour-id="exam-prep-link" className="text-body-sm text-body underline">
                Generate practice in Exam prep →
              </Link>
            </div>
            <FeedbackFlagButton feedbackId={props.feedbackId} />
          </div>
        </div>
      </div>
    </div>
  );
}
