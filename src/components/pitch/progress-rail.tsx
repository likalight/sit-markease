"use client";

// Fixed dot rail + slide counter, click a dot to jump. Hidden on small
// screens (below md) where the dots would overlap slide content.
export function ProgressRail({
  total,
  active,
  onJump,
}: {
  total: number;
  active: number;
  onJump: (index: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-y-0 right-4 z-40 hidden items-center md:flex">
      <div className="pointer-events-auto flex flex-col items-center gap-sm">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onJump(i)}
            className={`h-2 w-2 rounded-full transition-all ${
              i === active ? "h-5 bg-primary" : "bg-muted-soft/50 hover:bg-muted-soft"
            }`}
          />
        ))}
      </div>
      <span className="pointer-events-none absolute bottom-6 right-1 font-mono text-caption text-muted-soft">
        {String(active + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </span>
    </div>
  );
}
