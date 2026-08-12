"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ProgressRail } from "./progress-rail";
import { DeckNav } from "./deck-nav";

// A true slide deck: one <Slide> fills the viewport at a time, sliding
// horizontally (left/right, matching the "<- ->" nav hint and arrow keys)
// rather than scrolling down a page — closer to presenting from Keynote
// than scrolling a website. Was vertical scroll-snap; switched to a
// translateX carousel because "->" visually promising leftward motion
// while the page actually scrolled down read as broken, not just
// unconventional. Each direct child must be a <Slide>; this component
// assigns each one its index/total via cloneElement so individual slides
// don't need to know their own position.
export function Deck({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);

  const slides = Children.toArray(children).filter(isValidElement) as ReactElement<any>[];
  const total = slides.length;

  function goTo(index: number) {
    setActive(Math.max(0, Math.min(total - 1, index)));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        goTo(active + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goTo(active - 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, total]);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <div
        className="flex h-dvh transition-transform duration-500 ease-in-out"
        style={{ width: `${total * 100}vw`, transform: `translateX(-${active * 100}vw)` }}
      >
        {slides.map((slide, i) =>
          cloneElement(slide, {
            key: i,
            index: i,
            total,
          })
        )}
      </div>
      <Link href="/" className="fixed left-6 top-6 z-50 flex items-center gap-xs">
        <Logo variant={slides[active]?.props?.dark ? "on-dark" : "default"} className="h-9 w-auto" />
      </Link>
      <p className="pointer-events-none fixed right-4 top-4 z-40 font-mono text-caption text-muted-soft">
        ← → to navigate
      </p>
      <DeckNav total={total} active={active} onPrev={() => goTo(active - 1)} onNext={() => goTo(active + 1)} />
      <ProgressRail total={total} active={active} onJump={goTo} />
    </div>
  );
}
