// Practica mark — icon only, no wordmark. A black blocked square (matching
// the squared-off geometry of the real SIT mark) sitting on a tilted red
// plate (the same motif as SIT's own tilted red rectangle), with a white
// ascending-step-into-checkmark glyph: progress, verified.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Practica">
      <rect x="4" y="6" width="38" height="38" rx="3" fill="var(--color-primary)" transform="rotate(-6 23 25)" />
      <rect x="6" y="4" width="38" height="38" rx="3" fill="var(--color-ink)" />
      {/* Ascending steps rising into a checkmark flick — progress, verified. */}
      <path
        d="M12 32 L12 26 L18 26 L18 20 L24 20 L24 14 L30 14 L33 17 L40 8"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
