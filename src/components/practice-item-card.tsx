"use client";

import { useState } from "react";
import { MathText } from "./math";

interface Props {
  position: number;
  difficulty: "scaffold" | "target" | "extension";
  promptLatex: string;
  solutionLatex: string;
  hintLadder: string[];
  targetsBecause: string;
  provenance: { type: "retrieved" | "variant_of"; source_label: string };
  verifiedBy: "sympy" | "llm" | "unverified";
}

const DIFFICULTY_ORDER = ["scaffold", "target", "extension"] as const;

// docs/DESIGN.md §3 `practice-item` — difficulty ramp, hint ladder,
// solution gated behind an attempt, verification badge. Attempts aren't
// persisted (§4.2 P1 — mastery model), purely client-side gating here.
export function PracticeItemCard(props: Props) {
  const [attempt, setAttempt] = useState("");
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const hasAttempted = attempt.trim().length > 0;
  const filledSegments = DIFFICULTY_ORDER.indexOf(props.difficulty) + 1;

  return (
    <div className="flex flex-col gap-sm rounded-lg border border-hairline bg-canvas p-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-xxs" title={props.difficulty}>
          {DIFFICULTY_ORDER.map((_, i) => (
            <div key={i} className={`h-1.5 w-6 rounded-pill ${i < filledSegments ? "bg-verified" : "bg-hairline"}`} />
          ))}
          <span className="ml-xs text-caption-caps text-muted-soft">{props.difficulty}</span>
        </div>
        <span className="text-caption text-muted-soft">
          {props.provenance.type === "retrieved" ? "From" : "Variant of"} {props.provenance.source_label}
        </span>
      </div>

      <p className="text-body-md font-medium text-body-strong">
        <MathText latex={props.promptLatex} />
      </p>
      <p className="text-caption text-muted-soft">{props.targetsBecause}</p>

      <textarea
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        placeholder="Try it here before revealing hints or the solution..."
        className="min-h-16 rounded-sm border border-hairline bg-canvas px-sm py-xs text-body-sm"
      />

      <div className="flex flex-wrap items-center gap-xs">
        <button
          onClick={() => setHintsRevealed((n) => Math.min(n + 1, props.hintLadder.length))}
          disabled={hintsRevealed >= props.hintLadder.length}
          className="rounded-sm border border-hairline px-sm py-xs text-caption disabled:opacity-40"
        >
          Reveal a hint ({hintsRevealed}/{props.hintLadder.length})
        </button>
        <button
          onClick={() => setShowSolution(true)}
          disabled={!hasAttempted}
          title={hasAttempted ? undefined : "Try the problem first"}
          className="rounded-sm bg-primary px-sm py-xs text-caption text-on-primary disabled:opacity-40"
        >
          Show solution
        </button>
      </div>

      {hintsRevealed > 0 && (
        <ul className="flex flex-col gap-xxs rounded-sm bg-surface-soft p-sm text-caption text-body">
          {props.hintLadder.slice(0, hintsRevealed).map((hint, i) => (
            <li key={i}>
              <strong>Hint {i + 1}:</strong> {hint}
            </li>
          ))}
        </ul>
      )}

      {showSolution && (
        <div className="flex flex-col gap-xs rounded-sm bg-surface-soft px-sm py-sm">
          <p className="text-body-sm text-body">
            <strong>Solution:</strong> <MathText latex={props.solutionLatex} />
          </p>
          <span className="inline-flex w-fit items-center gap-xxs rounded-pill bg-verified-soft px-xs py-[1px] text-caption text-verified">
            ✓ Checked {props.verifiedBy === "sympy" ? "symbolically" : props.verifiedBy === "llm" ? "by model" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
