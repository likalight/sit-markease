// SIT MarkEase mark — a black blocked square (matching the squared-off
// geometry of the real SIT mark) sitting on a tilted red plate (SIT's own
// tilted red rectangle motif), with a single confident checkmark: not a
// blocky staircase-into-checkmark (the previous glyph), which read as noise
// at small sizes — one clean stroke reads instantly at 16px in a browser
// tab as well as it does at full size.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="SIT MarkEase">
      <rect x="4" y="6" width="38" height="38" rx="3" fill="var(--color-primary)" transform="rotate(-6 23 25)" />
      <rect x="6" y="4" width="38" height="38" rx="3" fill="var(--color-ink)" />
      <path
        d="M13 25 L20 33 L37 12"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
