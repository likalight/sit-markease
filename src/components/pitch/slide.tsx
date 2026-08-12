"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

// A single full-viewport slide inside <Deck>. `index`/`total`/`registerRef`
// are injected by Deck via cloneElement — never pass them by hand.
export function Slide({
  children,
  className = "",
  index,
  total,
  registerRef,
  eyebrow,
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  total?: number;
  registerRef?: (el: HTMLElement | null) => void;
  eyebrow?: string;
  dark?: boolean;
}) {
  return (
    <section
      ref={registerRef as any}
      data-slide-index={index}
      className={`dot-grid relative flex h-dvh w-full snap-start snap-always flex-col items-center justify-center overflow-hidden px-6 py-section ${dark ? "bg-surface-dark" : ""} ${className}`}
    >
      <Link href="/" className="absolute left-6 top-6 z-10 flex items-center gap-xs">
        <Logo variant={dark ? "on-dark" : "default"} className="h-9 w-auto" />
      </Link>
      <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-lg">
        {eyebrow && typeof index === "number" && (
          <p className={`font-mono text-caption-caps ${dark ? "text-on-dark-soft" : "text-muted-soft"}`}>
            FIG.{String(index + 1).padStart(2, "0")} · {eyebrow.toUpperCase()}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
