"use client";

import type { ReactNode } from "react";

// A single full-viewport slide inside <Deck>. `index`/`total` are injected
// by Deck via cloneElement — never pass them by hand. Slides sit side by
// side in Deck's horizontal flex track, so each one is a fixed w-screen
// panel, not a scrollable section. The logo used to live here, absolutely
// positioned per-slide, which meant it visibly slid left/right with the
// track — moved to a fixed <SiteNavbar> in Deck.tsx instead so it never
// moves.
export function Slide({
  children,
  className = "",
  index,
  total,
  eyebrow,
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  total?: number;
  eyebrow?: string;
  dark?: boolean;
}) {
  return (
    <section
      data-slide-index={index}
      className={`dot-grid relative flex h-dvh w-screen shrink-0 flex-col items-center justify-center overflow-hidden px-6 py-section ${dark ? "bg-surface-dark" : ""} ${className}`}
    >
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-lg">
        {eyebrow && typeof index === "number" && (
          <p className={`font-mono text-title-sm text-muted-soft ${dark ? "text-on-dark-soft" : ""}`}>
            FIG.{String(index + 1).padStart(2, "0")} · {eyebrow.toUpperCase()}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
