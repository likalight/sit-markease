"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const bootstrapMode = searchParams.get("tour");
    if (bootstrapMode === "formative" || bootstrapMode === "summative") {
      const fresh = { mode: bootstrapMode as TourMode, step: 0 };
      writeStoredState(fresh);
      setTourState(fresh);
      return;
    }
    setTourState(readStoredState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = tourState ? TOUR_STEPS[tourState.mode]?.[tourState.step] : null;
  const active = !!(step && step.matches(pathname));

  function advance() {
    if (!tourState || !step) return;
    // A click-target step that also switches persona (e.g. "Release all
    // results", a real form submit that doesn't navigate away on its own)
    // is safe to switch immediately — unlike the approve button, there's no
    // competing client-side navigation to race against here.
    if (step.switchTo && step.redirectAfterSwitch) {
      writeStoredState(null);
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
          const handler = () => advance();
          el.addEventListener("click", handler, { capture: true, once: true });
          cleanupClick = () => el.removeEventListener("click", handler, { capture: true } as any);
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

  if (!tourState || !step || !active) return null;

  async function handleNext() {
    setBusy(true);
    if (step!.switchTo && step!.redirectAfterSwitch) {
      const nextIndex = tourState!.step + 1;
      const isEnd = step!.end || nextIndex >= TOUR_STEPS[tourState!.mode].length;
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

  const tooltipTop = rect ? Math.min(rect.top + rect.height + 12, window.innerHeight - 220) : 24;
  const tooltipLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 336) : 24;

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
