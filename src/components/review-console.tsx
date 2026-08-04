"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScriptViewer } from "./script-viewer";
import { ConfidenceBar } from "./confidence-bar";
import { MathText } from "./math";
import { stepState } from "@/lib/design/step-state";

interface Step {
  stepIndex: number;
  lineIndices: number[];
  plainText: string;
  latex: string;
  role: string;
  confidence: number;
  agreement: number;
  hasMisconception: boolean;
}

interface RubricLevel {
  level: string;
  score: number;
  descriptor: string;
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

// docs/DESIGN.md §3/§4 — the review console. Product density: dense,
// keyboard-first, built for the fortieth script of the evening.
export function ReviewConsole(props: {
  submissionId: string;
  assessmentTitle: string;
  batchPosition: number | null;
  batchTotal: number;
  questionPromptText: string;
  originalUrl: string | null;
  boxes: { lineIndex: number; box: { x: number; y: number; w: number; h: number } }[];
  steps: Step[];
  criteria: Criterion[];
  rubricCriteria: { key: string; name: string; levels: RubricLevel[] }[];
  misconceptions: { name: string; evidenceStepIndices: number[] }[];
  needsHumanReview: boolean;
  totalRecommended: number;
  maxTotal: number;
  nextSubmissionId: string | null;
  releaseFeedback: { summary: string; strengths: { text: string; step_indices: number[] }[]; nextAction: string } | null;
}) {
  const router = useRouter();
  const [feedbackSummary, setFeedbackSummary] = useState(props.releaseFeedback?.summary ?? "");
  const [feedbackNextAction, setFeedbackNextAction] = useState(props.releaseFeedback?.nextAction ?? "");
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(props.criteria.map((c) => [c.criterionKey, c.score]))
  );
  const [levels, setLevels] = useState<Record<string, string>>(
    Object.fromEntries(props.criteria.map((c) => [c.criterionKey, c.level]))
  );
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [focusedCriterionIdx, setFocusedCriterionIdx] = useState(0);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [stepTexts, setStepTexts] = useState<Record<number, string>>(
    Object.fromEntries(props.steps.map((s) => [s.stepIndex, s.plainText]))
  );
  const [stepLatex, setStepLatex] = useState<Record<number, string>>(
    Object.fromEntries(props.steps.map((s) => [s.stepIndex, s.latex]))
  );
  const [expandedLatexStep, setExpandedLatexStep] = useState<number | null>(null);
  const [editingLatexStep, setEditingLatexStep] = useState<number | null>(null);
  const [editLatexText, setEditLatexText] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mountedAt = useRef(Date.now());
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const nameByKey = Object.fromEntries(props.rubricCriteria.map((c) => [c.key, c.name]));
  const levelsByKey = Object.fromEntries(props.rubricCriteria.map((c) => [c.key, c.levels]));

  // Reverse lookup so each transcription step can show which rubric part it
  // was used as evidence for — Gradescope-style "this working is Part (ii)"
  // annotation, requested alongside the clean-math-by-default view.
  const criterionNameByStep = new Map<number, string>();
  for (const c of props.criteria) {
    const name = nameByKey[c.criterionKey] ?? c.criterionKey;
    for (const idx of c.evidenceStepIndices) {
      criterionNameByStep.set(idx, criterionNameByStep.has(idx) ? `${criterionNameByStep.get(idx)}, ${name}` : name);
    }
  }
  const adjusted = props.criteria.some((c) => scores[c.criterionKey] !== c.score);
  const currentTotal = Object.values(scores).reduce((a, b) => a + b, 0);

  // Plain-language summary of the AI's own recommendation, derived from real
  // per-submission data (never fabricated) — matches the deck's "AI Summary"
  // dashboard banner. Criterion names can be missing on older/incomplete
  // rubric data — labelName falls back to the raw key, and drops the clause
  // entirely rather than ever rendering the literal word "null"/"undefined".
  function labelName(criterionKey: string | null | undefined): string | null {
    if (!criterionKey) return null;
    return nameByKey[criterionKey] ?? criterionKey;
  }
  const ranked = [...props.criteria].sort((a, b) => b.score / b.maxScore - a.score / a.maxScore);
  const strongestName = ranked.length > 0 ? labelName(ranked[0]?.criterionKey) : null;
  const weakestName = ranked.length > 1 ? labelName(ranked[ranked.length - 1]?.criterionKey) : null;
  const aiSummary = props.needsHumanReview
    ? `Recommends ${currentTotal}/${props.maxTotal}, but flagged this one for a closer look${
        props.misconceptions.length > 0 ? ` — likely ${props.misconceptions[0].name.toLowerCase()}` : ""
      }.`
    : `Recommends ${currentTotal}/${props.maxTotal}.${strongestName ? ` Strongest on "${strongestName}"` : ""}${
        weakestName && weakestName !== strongestName ? `, weakest on "${weakestName}"` : ""
      }${strongestName ? "." : ""}`;

  function scrollToStep(idx: number) {
    setSelectedStep(idx);
    stepRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function approveAndAdvance() {
    if (submitting) return;
    setSubmitting(true);
    const reviewSeconds = Math.round((Date.now() - mountedAt.current) / 1000);
    try {
      const res = await fetch(`/api/submissions/${props.submissionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalScore: currentTotal, adjusted, reviewSeconds }),
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

  function setLevelForCriterion(criterionKey: string, levelIdx: number) {
    const options = levelsByKey[criterionKey] ?? [];
    const chosen = options[levelIdx];
    if (!chosen) return;
    setLevels((prev) => ({ ...prev, [criterionKey]: chosen.level }));
    setScores((prev) => ({ ...prev, [criterionKey]: chosen.score }));
    fetch(`/api/submissions/${props.submissionId}/criteria/${criterionKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: chosen.level, score: chosen.score }),
    });
  }

  function setLevelOnFocused(levelIdx: number) {
    const criterion = props.criteria[focusedCriterionIdx];
    setLevelForCriterion(criterion.criterionKey, levelIdx);
  }

  function startEditFocusedStep() {
    const step = props.steps.find((s) => s.stepIndex === (selectedStep ?? props.steps[0]?.stepIndex));
    if (!step) return;
    setSelectedStep(step.stepIndex);
    setEditingStep(step.stepIndex);
    setEditText(stepTexts[step.stepIndex] ?? step.plainText);
  }

  async function saveEditedStep() {
    if (editingStep === null) return;
    setStepTexts((prev) => ({ ...prev, [editingStep]: editText }));
    await fetch(`/api/submissions/${props.submissionId}/steps/${editingStep}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plain_text: editText }),
    });
    setEditingStep(null);
  }

  function startEditLatex(stepIndex: number) {
    setEditingLatexStep(stepIndex);
    setEditLatexText(stepLatex[stepIndex] ?? "");
  }

  async function saveEditedLatex() {
    if (editingLatexStep === null) return;
    setStepLatex((prev) => ({ ...prev, [editingLatexStep]: editLatexText }));
    await fetch(`/api/submissions/${props.submissionId}/steps/${editingLatexStep}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latex: editLatexText }),
    });
    setEditingLatexStep(null);
  }

  async function saveFeedback() {
    await fetch(`/api/submissions/${props.submissionId}/feedback`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: feedbackSummary, next_action: feedbackNextAction }),
    });
    setEditingFeedback(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        approveAndAdvance();
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setFocusedCriterionIdx((i) => (i + 1) % Math.max(props.criteria.length, 1));
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setFocusedCriterionIdx((i) => (i - 1 + props.criteria.length) % Math.max(props.criteria.length, 1));
      } else if (e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        setLevelOnFocused(Number(e.key) - 1);
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        startEditFocusedStep();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        skip();
      } else if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTotal, adjusted, submitting, focusedCriterionIdx, selectedStep, props.criteria.length]);

  const scriptBoxes = props.boxes.map((b) => {
    const step = props.steps.find((s) => s.lineIndices.includes(b.lineIndex));
    return {
      lineIndex: b.lineIndex,
      box: b.box,
      state: step ? stepState(step.agreement, step.hasMisconception) : ("neutral" as const),
    };
  });
  const activeLines = new Set(
    props.steps.filter((s) => s.stepIndex === selectedStep).flatMap((s) => s.lineIndices)
  );

  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* Gradescope-style batch context — which assignment, and where this
          submission sits among the others for the same question. "Next"
          only ever advances within this same batch (see the page component's
          nextSubmissionId), so the instructor works one rubric at a time. */}
      <div className="flex items-center justify-between border-b border-hairline bg-surface-dark px-lg py-xs">
        <span className="font-mono text-caption-caps text-on-dark">{props.assessmentTitle}</span>
        {props.batchPosition !== null && (
          <span className="font-mono text-caption tabular-nums text-on-dark-soft">
            {props.batchPosition} of {props.batchTotal}
          </span>
        )}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr_1fr]">
      {/* Left: script-viewer, on a ruled-paper backdrop matching the
          deck's "handwritten script — scanned" dashboard mockup */}
      <div
        className="overflow-auto border-r border-hairline p-lg"
        style={{
          backgroundImage: "repeating-linear-gradient(var(--color-canvas) 0px, var(--color-canvas) 27px, var(--color-hairline-soft) 28px)",
        }}
      >
        <h2 className="mb-sm font-mono text-caption-caps text-muted-soft">Original script</h2>
        {props.originalUrl ? (
          <ScriptViewer
            imageUrl={props.originalUrl}
            boxes={scriptBoxes}
            activeLineIndices={activeLines}
            onBoxClick={(lineIndex) => {
              const step = props.steps.find((s) => s.lineIndices.includes(lineIndex));
              if (step) scrollToStep(step.stepIndex);
            }}
          />
        ) : (
          <p className="text-body-sm text-muted-soft">No image available.</p>
        )}
      </div>

      {/* Centre: step-row list */}
      <div className="overflow-auto border-r border-hairline p-lg">
        <h2 className="mb-sm font-mono text-caption-caps text-muted-soft">Reconciled steps</h2>
        <p className="mb-md text-caption text-muted-soft">{props.questionPromptText}</p>
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
                    <span className="tabular-nums">
                      {state !== "verified" && (
                        <span className="mr-xs rounded-pill bg-surface-card px-xs py-[1px] text-caption-caps">
                          {state === "disputed" ? "human required" : "misconception"}
                        </span>
                      )}
                      conf {(s.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {editingStep === s.stepIndex ? (
                    <div className="mt-xs flex flex-col gap-xs">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-16 rounded-sm border border-primary/40 bg-canvas px-xs py-xs text-body-sm"
                        autoFocus
                      />
                      <div className="flex gap-xs">
                        <button
                          onClick={saveEditedStep}
                          className="rounded-sm bg-ink px-xs py-[2px] text-caption text-on-dark"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingStep(null)}
                          className="rounded-sm border border-hairline px-xs py-[2px] text-caption"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Clean rendered math by default (CLAUDE.md: never show
                          raw LaTeX to a user) — the source string is only one
                          click away for an instructor who wants to check or
                          correct it, never shown up front. */}
                      <p className="text-body-sm text-body">
                        <MathText latex={stepLatex[s.stepIndex] ?? s.latex} />
                      </p>
                      <p className="text-caption text-muted">{stepTexts[s.stepIndex]}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedLatexStep((v) => (v === s.stepIndex ? null : s.stepIndex));
                        }}
                        className="mt-xxs font-mono text-caption text-muted-soft underline"
                      >
                        {expandedLatexStep === s.stepIndex ? "hide LaTeX" : "view LaTeX"}
                      </button>
                      {expandedLatexStep === s.stepIndex && (
                        <div className="mt-xs rounded-sm border border-hairline bg-surface-soft p-xs">
                          {editingLatexStep === s.stepIndex ? (
                            <div className="flex flex-col gap-xs">
                              <textarea
                                value={editLatexText}
                                onChange={(e) => setEditLatexText(e.target.value)}
                                className="min-h-14 rounded-sm border border-primary/40 bg-canvas px-xs py-xs font-mono text-caption"
                                autoFocus
                              />
                              <div className="flex gap-xs">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveEditedLatex();
                                  }}
                                  className="rounded-sm bg-ink px-xs py-[2px] text-caption text-on-dark"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingLatexStep(null);
                                  }}
                                  className="rounded-sm border border-hairline px-xs py-[2px] text-caption"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-xs">
                              <code className="whitespace-pre-wrap break-all font-mono text-caption text-muted">
                                {stepLatex[s.stepIndex] ?? s.latex}
                              </code>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditLatex(s.stepIndex);
                                }}
                                className="shrink-0 font-mono text-caption text-body underline"
                              >
                                edit
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <div className="mt-xs w-24">
                    <ConfidenceBar value={s.confidence} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: criterion-cards + approve */}
      <div className="flex flex-col overflow-auto p-lg">
        <h2 className="mb-sm font-mono text-caption-caps text-muted-soft">Recommendation</h2>

        {/* AI Summary banner — matches the deck's dashboard mockup */}
        <div className="mb-sm flex items-start gap-xs rounded-sm bg-primary-soft px-sm py-xs">
          <span className="mt-[1px] shrink-0 rounded-sm bg-primary px-xs py-[1px] font-mono text-caption-caps text-on-primary">
            AI Summary
          </span>
          <p className="text-body-sm text-body">{aiSummary}</p>
        </div>

        {props.needsHumanReview && (
          <p className="mb-sm rounded-sm bg-disputed-soft px-sm py-xs text-caption text-disputed">
            ⚑ Flagged for human review
          </p>
        )}

        {/* Instructor marking mode (Nicholas's review): approving a score
            isn't the only gate — the instructor verifies the actual words
            the student is about to receive, not just the number. */}
        {props.releaseFeedback && (
          <div className="mb-sm rounded-sm border border-hairline p-sm">
            <div className="mb-xs flex items-center justify-between">
              <p className="font-mono text-caption-caps text-muted-soft">What the student will see</p>
              {!editingFeedback && (
                <button onClick={() => setEditingFeedback(true)} className="text-caption text-body underline">
                  edit
                </button>
              )}
            </div>
            {editingFeedback ? (
              <div className="flex flex-col gap-xs">
                <label className="flex flex-col gap-xxs text-caption text-muted-soft">
                  Summary
                  <textarea
                    value={feedbackSummary}
                    onChange={(e) => setFeedbackSummary(e.target.value)}
                    className="min-h-14 rounded-sm border border-primary/40 bg-canvas px-xs py-xs text-body-sm text-body"
                  />
                </label>
                <label className="flex flex-col gap-xxs text-caption text-muted-soft">
                  Next action
                  <textarea
                    value={feedbackNextAction}
                    onChange={(e) => setFeedbackNextAction(e.target.value)}
                    className="min-h-10 rounded-sm border border-primary/40 bg-canvas px-xs py-xs text-body-sm text-body"
                  />
                </label>
                <div className="flex gap-xs">
                  <button onClick={saveFeedback} className="rounded-sm bg-ink px-xs py-[2px] text-caption text-on-dark">
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setFeedbackSummary(props.releaseFeedback?.summary ?? "");
                      setFeedbackNextAction(props.releaseFeedback?.nextAction ?? "");
                      setEditingFeedback(false);
                    }}
                    className="rounded-sm border border-hairline px-xs py-[2px] text-caption"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-xs">
                <p className="text-body-sm text-body">{feedbackSummary}</p>
                {props.releaseFeedback.strengths.length > 0 && (
                  <ul className="flex flex-col gap-xxs">
                    {props.releaseFeedback.strengths.map((s, i) => (
                      <li key={i} className="text-body-sm text-verified">
                        ✓ {s.text}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-body-sm text-muted">
                  <strong className="text-body-strong">Next:</strong> {feedbackNextAction}
                </p>
              </div>
            )}
          </div>
        )}

        <p className="mb-xs font-mono text-caption-caps text-muted-soft">Rubric — RAG-matched</p>
        <div className="flex flex-col border-t border-hairline">
          {props.criteria.map((c, i) => {
            const evidenceSteps = props.steps.filter((s) => c.evidenceStepIndices.includes(s.stepIndex));
            const cardState = evidenceSteps.some((s) => s.agreement < 0.6)
              ? "disputed"
              : c.confidence < 0.85
                ? "attention"
                : "verified";
            const checkboxBorder =
              cardState === "verified" ? "border-verified" : cardState === "attention" ? "border-attention" : "border-disputed";
            const fill = scores[c.criterionKey] / c.maxScore;
            const focused = i === focusedCriterionIdx;
            return (
              <div
                key={c.criterionKey}
                onClick={() => setFocusedCriterionIdx(i)}
                className={`flex cursor-pointer items-start gap-sm border-b border-hairline px-xs py-sm ${
                  focused ? "bg-surface-soft" : ""
                }`}
              >
                <div
                  className={`mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border-2 ${checkboxBorder}`}
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
                  <div className="flex flex-wrap items-center gap-xs">
                    <span className="text-title-sm font-semibold text-body-strong">
                      {nameByKey[c.criterionKey] ?? c.criterionKey}
                    </span>
                    <span className="rounded-sm border border-muted-soft/40 px-xs py-[1px] font-mono text-caption text-muted-soft">
                      RAG
                    </span>
                  </div>
                  <p className="text-body-sm text-muted">{c.justification}</p>
                  <div className="mt-xxs flex flex-wrap gap-xxs">
                    {c.evidenceStepIndices.map((idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToStep(idx);
                        }}
                        className="rounded-pill bg-surface-card px-xs py-[1px] text-caption text-body"
                      >
                        Step {idx}
                      </button>
                    ))}
                  </div>
                  {/* AI suggests, instructor decides — every level is a
                      direct, clickable choice, not just a keyboard shortcut. */}
                  <div className="mt-xxs flex flex-wrap gap-xxs">
                    {(levelsByKey[c.criterionKey] ?? []).map((lvl) => (
                      <button
                        key={lvl.level}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedCriterionIdx(i);
                          setLevelForCriterion(c.criterionKey, (levelsByKey[c.criterionKey] ?? []).indexOf(lvl));
                        }}
                        title={lvl.descriptor}
                        className={`rounded-sm border px-xs py-[1px] text-caption ${
                          levels[c.criterionKey] === lvl.level
                            ? "border-primary bg-primary-soft font-medium text-primary-active"
                            : "border-hairline text-muted"
                        }`}
                      >
                        {lvl.level} · {lvl.score}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-title-sm font-bold tabular-nums text-primary-active">
                  +{scores[c.criterionKey]}
                </span>
              </div>
            );
          })}
        </div>

        {props.misconceptions.length > 0 && (
          <div className="mt-sm rounded-lg bg-attention-soft p-sm">
            <p className="text-caption-caps text-attention">Misconceptions detected</p>
            {props.misconceptions.map((m, i) => (
              <p key={i} className="text-body-sm text-body">
                {m.name} <span className="text-caption text-muted">(step {m.evidenceStepIndices.join(", ")})</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-xs border-t border-hairline pt-md">
          <p className="text-body-sm tabular-nums">
            Total: <strong className="text-body-strong">{currentTotal}</strong> / {props.maxTotal}
            {adjusted && <span className="ml-xs text-caption text-attention">adjusted</span>}
          </p>
          <div className="flex gap-xs">
            <button
              onClick={approveAndAdvance}
              disabled={submitting}
              className="rounded-sm bg-primary px-sm py-xs text-body-sm font-medium text-on-primary disabled:opacity-50"
            >
              Approve &amp; next <span className="opacity-70">(A)</span>
            </button>
            <button onClick={startEditFocusedStep} className="rounded-sm border border-hairline px-sm py-xs text-body-sm">
              Edit step <span className="opacity-60">(E)</span>
            </button>
            <button onClick={skip} className="rounded-sm border border-hairline px-sm py-xs text-body-sm">
              Skip <span className="opacity-60">(S)</span>
            </button>
          </div>
          <p className="text-caption text-muted-soft">
            J/K focus criterion · 1–5 set level · ? for shortcuts
          </p>
        </div>
      </div>
      </div>

      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dark/60"
          onClick={() => setShowShortcuts(false)}
        >
          <div className="w-80 rounded-lg bg-canvas p-lg shadow-overlay" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-sm font-serif text-display-sm text-ink">Shortcuts</h3>
            <ul className="flex flex-col gap-xxs text-body-sm text-body">
              <li><strong>A</strong> — Approve and advance</li>
              <li><strong>J / K</strong> — Next / previous criterion</li>
              <li><strong>1–5</strong> — Set level on focused criterion</li>
              <li><strong>E</strong> — Edit focused step transcription</li>
              <li><strong>S</strong> — Skip, leave in queue</li>
              <li><strong>?</strong> — Toggle this overlay</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
