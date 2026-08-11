import Image from "next/image";

// SIT MarkEase mark — the real brand lockup ("SiT | MarkEase"), background
// removed, MarkEase sized up relative to SIT. Wide aspect (893:230) —
// callers should size by height only (e.g. "h-9 w-auto") rather than
// forcing a fixed width, or it distorts.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo-full.png"
      alt="SIT MarkEase"
      width={893}
      height={230}
      className={className}
      priority
    />
  );
}
