"use client";

// Bottom-left prev/next control + "01/07" counter — a second, more
// deliberate way to move through the deck than the dot rail alone, and a
// visual pairing with it (rail bottom-right, counter+arrows bottom-left)
// so the chrome reads as a real presentation tool, not a webpage.
export function DeckNav({
  total,
  active,
  onPrev,
  onNext,
}: {
  total: number;
  active: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 flex items-center gap-sm">
      <div className="pointer-events-auto flex items-center gap-xxs">
        <button
          aria-label="Previous slide"
          onClick={onPrev}
          disabled={active === 0}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-hairline bg-canvas text-body-sm text-muted disabled:opacity-30"
        >
          ←
        </button>
        <button
          aria-label="Next slide"
          onClick={onNext}
          disabled={active === total - 1}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-hairline bg-canvas text-body-sm text-body disabled:opacity-30"
        >
          →
        </button>
      </div>
      <span className="pointer-events-none font-mono text-caption text-muted-soft">
        {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
    </div>
  );
}
