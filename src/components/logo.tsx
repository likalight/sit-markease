import Image from "next/image";

// SIT MarkEase mark — the real brand lockup ("SiT | MarkEase"), background
// removed, MarkEase sized up relative to SIT. Wide aspect (893:230) —
// callers should size by height only (e.g. "h-9 w-auto") rather than
// forcing a fixed width, or it distorts.
//
// The source art is dark maroon — legible on the cream canvas, but reads
// as nearly invisible on dark surfaces (the scalability slide, every
// app sidebar). `variant="on-dark"` swaps to a cream-on-transparent
// recolor (public/logo-full-on-dark.png, generated via sharp by keying
// the same alpha mask against --color-on-dark) instead of relying on a
// CSS filter, which would fight the logo's own gradient shading.
export function Logo({ className = "", variant = "default" }: { className?: string; variant?: "default" | "on-dark" }) {
  return (
    <Image
      src={variant === "on-dark" ? "/logo-full-on-dark.png" : "/logo-full.png"}
      alt="SIT MarkEase"
      width={893}
      height={230}
      className={className}
      priority
    />
  );
}
