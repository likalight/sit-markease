"use client";

import { useState } from "react";

interface Props {
  position: number;
  difficulty: "scaffold" | "target" | "extension";
  promptLatex: string;
  solutionLatex: string;
  hintLadder: string[];
  targetsBecause: string;
  provenance: { type: "retrieved" | "variant_of"; source_label: string };
}

// §11.1 S2 — progressive hint ladder; solution gated behind an attempt.
// Not persisted (practice_attempts / mastery model is P1, §4.2) — purely a
// client-side gate for this build.
export function PracticeItemCard(props: Props) {
  const [attempt, setAttempt] = useState("");
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const hasAttempted = attempt.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 rounded border border-neutral-200 p-4">
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span className="rounded-full border border-neutral-300 px-2 py-0.5 uppercase">{props.difficulty}</span>
        <span>
          {props.provenance.type === "retrieved" ? "From" : "Variant of"} {props.provenance.source_label}
        </span>
      </div>

      <p className="text-sm font-medium">{props.promptLatex}</p>
      <p className="text-xs text-neutral-400">{props.targetsBecause}</p>

      <textarea
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        placeholder="Try it here before revealing hints or the solution..."
        className="min-h-16 rounded border border-neutral-300 px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setHintsRevealed((n) => Math.min(n + 1, props.hintLadder.length))}
          disabled={hintsRevealed >= props.hintLadder.length}
          className="rounded border border-neutral-300 px-3 py-1 text-xs disabled:opacity-40"
        >
          Reveal a hint ({hintsRevealed}/{props.hintLadder.length})
        </button>
        <button
          onClick={() => setShowSolution(true)}
          disabled={!hasAttempted}
          title={hasAttempted ? undefined : "Try the problem first"}
          className="rounded bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-40"
        >
          Show solution
        </button>
      </div>

      {hintsRevealed > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-neutral-600">
          {props.hintLadder.slice(0, hintsRevealed).map((hint, i) => (
            <li key={i}>
              <strong>Hint {i + 1}:</strong> {hint}
            </li>
          ))}
        </ul>
      )}

      {showSolution && (
        <p className="rounded bg-neutral-50 px-3 py-2 text-sm">
          <strong>Solution:</strong> {props.solutionLatex}
        </p>
      )}
    </div>
  );
}
