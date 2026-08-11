"use client";

import { motion } from "framer-motion";

// docs/DESIGN.md §3 `confidence-bar` — 3px, track hairline, fill gradient.
// Never coloured by value: confidence is not correctness, and conflating
// them teaches the educator the wrong thing. The gradient is fixed
// (cyan->crimson-active) regardless of value — only the fill WIDTH encodes
// the number, same rule as the old flat neutral-low fill, just restyled as
// a data readout for the dark theme. `showLabel` is opt-in since several
// call sites place this in a narrow fixed-width slot (w-24) that a label
// would overflow.
export function ConfidenceBar({ value, showLabel = false }: { value: number; showLabel?: boolean }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-xs">
      <div className="h-[3px] w-full rounded-pill bg-hairline">
        <motion.div
          className="h-[3px] rounded-pill bg-gradient-to-r from-[var(--gradient-accent-3)] to-[var(--color-primary-active)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      {showLabel && (
        <span className="whitespace-nowrap font-mono text-data-sm tabular-nums text-muted-soft">{pct}%</span>
      )}
    </div>
  );
}
