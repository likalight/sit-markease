import type { ReactNode } from "react";

// Thin dark title-bar chrome around a real product screenshot — cheap,
// signals "captured from a running app" rather than "cropped PNG in a
// box." Used by both pinned journeys.
export function BrowserFrame({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="glass-card overflow-hidden p-0 shadow-overlay">
      <div className="flex items-center gap-xxs bg-surface-dark px-sm py-xs">
        <span className="h-2 w-2 rounded-full bg-disputed/70" />
        <span className="h-2 w-2 rounded-full bg-attention/70" />
        <span className="h-2 w-2 rounded-full bg-verified/70" />
      </div>
      <div className="p-xs">{children}</div>
      <p className="pb-xs text-center font-mono text-caption text-muted-soft">{caption}</p>
    </div>
  );
}
