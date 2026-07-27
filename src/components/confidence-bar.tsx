// docs/DESIGN.md §3 `confidence-bar` — 3px, track hairline, fill neutral-low.
// Never coloured by value: confidence is not correctness, and conflating
// them teaches the educator the wrong thing.
export function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="h-[3px] w-full rounded-pill bg-hairline">
      <div className="h-[3px] rounded-pill bg-neutral-low" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}
