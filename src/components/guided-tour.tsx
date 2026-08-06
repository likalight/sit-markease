"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { TOUR_STEPS, type TourMode } from "@/lib/demo-tour/config";
import { switchRoleAction } from "@/lib/demo-tour/actions";

const STORAGE_KEY = "aims_demo_tour";

type TourState = { mode: TourMode; step: number };
type Rect = { top: number; left: number; width: number; height: number };

function readStoredState(): TourState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.mode === "formative" || parsed.mode === "summative") && typeof parsed.step === "number") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function writeStoredState(state: TourState | null) {
  if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  else window.localStorage.removeItem(STORAGE_KEY);
}

// Client-side-only step tracker, deliberately not server/cookie-driven: an
// earlier version wrote the current step to a cookie via a server action
// fired alongside the real product button's click, but that server round
// trip was racing the real button's own click-triggered navigation and
// reliably losing — the tour would silently vanish. Plain advances
// (advanceOn: 'click-target' / 'button' without a role switch) now update
// localStorage synchronously, so there's nothing to race. Only the actual
// persona switch needs the server (a real sign-in) — that happens via its
// own dedicated tour button, never bundled onto a real product button.
export function GuidedTour() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tourState, setTourState] = useState<TourState | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 200 });
  // See the catch-up effect below for why this exists: flips true right
  // before any self-triggered step change (advance()/handleNext()), so that
  // effect can tell "we just moved the step ourselves, pathname hasn't
  // caught up yet" apart from "the product genuinely skipped a page."
  const advanceRef = useRef(false);

  useEffect(() => {
    const bootstrapMode = searchParams.get("tour");
    if (bootstrapMode === "formative" || bootstrapMode === "summative") {
      const fresh = { mode: bootstrapMode as TourMode, step: 0 };
      writeStoredState(fresh);
      setTourState(fresh);
      // Strip ?tour= immediately — otherwise reloading this exact page
      // later (still carrying the query param) re-bootstraps to step 0
      // and silently wipes any real progress already made.
      window.history.replaceState(null, "", pathname);
      return;
    }
    setTourState(readStoredState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rawStep = tourState ? TOUR_STEPS[tourState.mode]?.[tourState.step] : null;

  // Some steps' real page can be skipped entirely by the product itself
  // (e.g. a confident script mapping goes straight to /review, bypassing
  // the manual mapping-review page a less-confident upload would need) —
  // if the current step's page isn't where we landed, but a LATER step's
  // page is, jump the tracker forward to it instead of getting stuck
  // waiting on a target that was never going to appear on this run.
  useEffect(() => {
    if (!tourState) return;
    // advance()/handleNext() commit the new step SYNCHRONOUSLY, well before
    // the real navigation they triggered actually lands — so this effect's
    // very first run after a self-triggered step change reads a STALE
    // pathname against the already-advanced step. A fixed debounce here
    // previously tried to paper over that by waiting out the race, but a
    // real server-action round trip (e.g. creating an attempt row) can take
    // longer than any debounce window picked in advance, so the premature
    // check still fired — and since several steps in this tour intentionally
    // reuse the same pathname ("/submit" 4x, "/feedback" 3x, "/work/" 2x),
    // catching up against a stale pathname can land on a step several hops
    // further ahead than the real next one (reproduced live: jumped from
    // step 3 straight to step 8). advanceRef, set by every self-triggered
    // step change below, makes this exact-once instead of timing-based:
    // skip the very next run of this effect unconditionally (that's the
    // stale one, always caused by our own state update, never a real
    // navigation), then let it evaluate for real once pathname itself
    // actually changes — by which point it reflects reality.
    if (advanceRef.current) {
      advanceRef.current = false;
      return;
    }
    const steps = TOUR_STEPS[tourState.mode];
    const current = steps[tourState.step];
    if (!current || current.matches(pathname)) return;
    const aheadIndex = steps.findIndex((candidate, i) => i > tourState.step && candidate.matches(pathname));
    if (aheadIndex !== -1) {
      const skipped = { mode: tourState.mode, step: aheadIndex };
      writeStoredState(skipped);
      setTourState(skipped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, tourState?.step]);

  const step = tourState ? TOUR_STEPS[tourState.mode]?.[tourState.step] : null;
  const active = !!(step && step.matches(pathname));

  function advance() {
    if (!tourState || !step) return;
    // A click-target step that also switches persona (e.g. "Release all
    // results", a real form submit that doesn't navigate away on its own)
    // is safe to switch immediately — unlike the approve button, there's no
    // competing client-side navigation to race against here. Must advance
    // to the NEXT step here, not clear the state — writing null silently
    // ended the tour on every persona switch (no tooltip on the page it
    // redirects to), since the page it lands on reads a wiped localStorage
    // on mount. Mirrors handleNext's button-driven switch path below.
    if (step.switchTo && step.redirectAfterSwitch) {
      const nextIndex = tourState.step + 1;
      const isEnd = step.end || nextIndex >= TOUR_STEPS[tourState.mode].length;
      advanceRef.current = true;
      writeStoredState(isEnd ? null : { mode: tourState.mode, step: nextIndex });
      void switchRoleAction(step.switchTo, step.redirectAfterSwitch);
      return;
    }
    const nextIndex = tourState.step + 1;
    if (step.end || nextIndex >= TOUR_STEPS[tourState.mode].length) {
      writeStoredState(null);
      setTourState(null);
      return;
    }
    const next = { mode: tourState.mode, step: nextIndex };
    advanceRef.current = true;
    writeStoredState(next);
    setTourState(next);
  }

  useEffect(() => {
    if (!active || !step) {
      setRect(null);
      return;
    }
    setNotFound(false);
    let attempts = 0;
    let cancelled = false;
    let cleanupClick: (() => void) | undefined;

    function locate() {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour-id="${step!.targetTourId}"]`) as HTMLElement | null;
      if (el) {
        const box = el.getBoundingClientRect();
        setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
        if (step!.advanceOn === "click-target") {
          if (step!.switchTo && step!.redirectAfterSwitch && step!.waitForFormRemoval) {
            // This target is a real form submit (e.g. "Release all results")
            // — its own server action needs time to actually complete before
            // we sign out and redirect. Firing switchRoleAction immediately
            // on click raced that in-flight submission and aborted it before
            // it ever wrote the release, leaving status stuck at "open."
            // Wait for the element to actually leave the DOM (the real
            // completion signal — the form stops rendering once released)
            // before switching roles. Only steps that set this flag need it
            // — a form that stays put and just revalidates in place (e.g.
            // "Save & issue") never satisfies this and previously just burned
            // the full 15s fallback for nothing, badly stalling the tour.
            const target = el;
            const handler = () => {
              const observer = new MutationObserver(() => {
                if (!document.body.contains(target)) {
                  observer.disconnect();
                  clearTimeout(fallback);
                  advance();
                }
              });
              observer.observe(document.body, { childList: true, subtree: true });
              const fallback = setTimeout(() => {
                observer.disconnect();
                advance();
              }, 15000);
            };
            el.addEventListener("click", handler, { capture: true, once: true });
            cleanupClick = () => el.removeEventListener("click", handler, { capture: true } as any);
          } else {
            const handler = () => advance();
            el.addEventListener("click", handler, { capture: true, once: true });
            cleanupClick = () => el.removeEventListener("click", handler, { capture: true } as any);
          }
        }
        return;
      }
      attempts += 1;
      if (attempts > 25) {
        setNotFound(true);
        return;
      }
      setTimeout(locate, 200);
    }
    locate();

    const reposition = () => {
      const el = document.querySelector(`[data-tour-id="${step!.targetTourId}"]`) as HTMLElement | null;
      if (el) {
        const box = el.getBoundingClientRect();
        setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      }
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      cleanupClick?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step?.targetTourId, pathname]);

  // Measures the tooltip's actual rendered height (body text length varies
  // per step) so the below-vs-above placement decision below isn't working
  // off a guessed constant — a guess that ran short on a longer step let
  // the "place above" branch overlap the target it was meant to avoid.
  useEffect(() => {
    if (!tooltipRef.current) return;
    const box = tooltipRef.current.getBoundingClientRect();
    setTooltipSize((prev) =>
      Math.abs(prev.width - box.width) > 0.5 || Math.abs(prev.height - box.height) > 0.5
        ? { width: box.width, height: box.height }
        : prev
    );
  });

  if (!tourState || !step || !active) return null;

  async function handleNext() {
    setBusy(true);
    if (step!.switchTo && step!.redirectAfterSwitch) {
      const nextIndex = tourState!.step + 1;
      const isEnd = step!.end || nextIndex >= TOUR_STEPS[tourState!.mode].length;
      advanceRef.current = true;
      writeStoredState(isEnd ? null : { mode: tourState!.mode, step: nextIndex });
      await switchRoleAction(step!.switchTo, step!.redirectAfterSwitch);
      return;
    }
    if (step!.end) {
      writeStoredState(null);
      window.location.href = "/";
      return;
    }
    advance();
    setBusy(false);
  }

  function handleSkip() {
    writeStoredState(null);
    setTourState(null);
  }

  let tooltipTop = 24;
  let tooltipLeft = 24;
  if (rect) {
    const fitsBelow = rect.top + rect.height + 12 + tooltipSize.height <= window.innerHeight;
    tooltipTop = fitsBelow
      ? rect.top + rect.height + 12
      : Math.max(12, rect.top - tooltipSize.height - 12);
    tooltipLeft = Math.min(Math.max(rect.left, 16), window.innerWidth - tooltipSize.width - 16);
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {rect && (
        <div
          className="pointer-events-none absolute rounded-md ring-4 ring-primary transition-all duration-150"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(30, 12, 8, 0.55)",
          }}
        />
      )}
      <div
        ref={tooltipRef}
        className="pointer-events-auto absolute w-80 rounded-lg border border-hairline bg-surface-card p-md shadow-overlay"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <p className="font-mono text-caption-caps text-muted-soft">
          Guided demo · {tourState.mode} · step {tourState.step + 1} of {TOUR_STEPS[tourState.mode].length}
        </p>
        <p className="mt-xxs text-title-sm font-semibold text-body-strong">{step.title}</p>
        <p className="mt-xxs text-body-sm text-body">{step.body}</p>
        {notFound && (
          <p className="mt-xs text-caption text-attention">
            Still loading — the highlighted element should appear shortly.
          </p>
        )}
        <div className="mt-sm flex items-center gap-sm">
          {step.advanceOn === "button" && (
            <button
              onClick={handleNext}
              disabled={busy}
              className="rounded-sm bg-primary px-sm py-xs text-caption font-medium text-on-primary disabled:opacity-60"
            >
              {busy ? "Loading…" : step.end ? "Back to home →" : "Next →"}
            </button>
          )}
          <button onClick={handleSkip} className="text-caption text-muted underline">
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}
