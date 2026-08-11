"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ProgressRail } from "./progress-rail";

// A true slide deck, not a marketing scroll page: one <Slide> fills the
// viewport at a time, scroll-snap-locked, with keyboard nav and a
// clickable progress rail — closer to presenting from Keynote than
// scrolling a website. Each direct child must be a <Slide>; this component
// assigns each one its index/total via cloneElement so individual slides
// don't need to know their own position.
export function Deck({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const slides = Children.toArray(children).filter(isValidElement) as ReactElement<any>[];
  const total = slides.length;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = Number((entry.target as HTMLElement).dataset.slideIndex);
            if (!Number.isNaN(index)) setActive(index);
          }
        }
      },
      { root: container, threshold: [0.6] }
    );

    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [total]);

  function goTo(index: number) {
    const clamped = Math.max(0, Math.min(total - 1, index));
    slideRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        goTo(active + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goTo(active - 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, total]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-dvh snap-y snap-mandatory overflow-y-scroll overflow-x-clip scroll-smooth"
      >
        {slides.map((slide, i) =>
          cloneElement(slide, {
            key: i,
            index: i,
            total,
            registerRef: (el: HTMLElement | null) => {
              slideRefs.current[i] = el;
            },
          })
        )}
      </div>
      <ProgressRail total={total} active={active} onJump={goTo} />
    </div>
  );
}
