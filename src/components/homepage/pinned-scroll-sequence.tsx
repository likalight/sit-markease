"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type PinnedStep = {
  label: string;
  title: string;
  body: string;
  visual: ReactNode;
};

// Shared engine behind every pinned "Apple product page" scroll moment on
// this site — one sticky viewport-height section per group of steps, with
// captions and visuals crossfading in lockstep as the user scrolls through
// it. Drives opacity via a manual, rAF-throttled scroll listener computing
// each step's progress directly from getBoundingClientRect(), rather than
// Framer's useScroll/useTransform — more predictable for a section whose
// height depends on runtime content (screenshots of varying aspect ratio).
// Per the scroll-experience skill: CSS sticky, scroll-LINKED (scrubbed)
// opacity, no scroll-snap/scroll-hijacking.
export function PinnedScrollSequence({ steps }: { steps: PinnedStep[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepCount = steps.length;
  const [opacities, setOpacities] = useState<number[]>(() => steps.map((_, i) => (i === 0 ? 1 : 0)));

  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    function update() {
      raf = 0;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollable = rect.height - vh;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;

      const next: number[] = [];
      for (let i = 0; i < stepCount; i++) {
        const segment = 1 / stepCount;
        const start = i * segment;
        const end = (i + 1) * segment;
        const fadeIn = start + segment * 0.15;
        const fadeOut = end - segment * 0.15;

        let opacity: number;
        if (progress <= start || progress >= end) opacity = 0;
        else if (progress < fadeIn) opacity = (progress - start) / (fadeIn - start);
        else if (progress > fadeOut) opacity = 1 - (progress - fadeOut) / (end - fadeOut);
        else opacity = 1;

        next.push(opacity);
      }
      setOpacities(next);
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stepCount]);

  return (
    <div ref={containerRef} style={{ height: `${stepCount * 100}vh` }} className="relative">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-xl px-6 md:grid-cols-[0.85fr_1.15fr]">
          <div className="relative h-[280px] md:h-[360px]">
            {steps.map((step, i) => (
              <div
                key={step.label}
                style={{
                  opacity: opacities[i],
                  transform: reducedMotionRef.current ? undefined : `translateY(${16 - opacities[i] * 16}px)`,
                }}
                className="absolute inset-0 flex flex-col justify-center gap-sm text-left"
              >
                <p className="font-mono text-caption-caps text-primary-active">
                  {String(i + 1).padStart(2, "0")} — {step.label}
                </p>
                <h3 className="font-serif text-display-md font-bold text-ink">{step.title}</h3>
                <p className="max-w-md text-body-md text-muted">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="relative h-[360px] md:h-[540px]">
            {steps.map((step, i) => (
              <div key={step.label} style={{ opacity: opacities[i] }} className="absolute inset-0 flex items-center justify-center">
                {step.visual}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
