// Stylized, simplified icon marks for each technology — not reproductions
// of each vendor's exact trademarked logo file (we don't have those assets
// and won't fabricate a pixel copy of someone else's mark), just enough of
// each one's recognizable shape to read as "that's React / that's Python."
function ReactIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6">
      <circle cx="16" cy="16" r="2.6" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <ellipse cx="16" cy="16" rx="12" ry="5" />
        <ellipse cx="16" cy="16" rx="12" ry="5" transform="rotate(60 16 16)" />
        <ellipse cx="16" cy="16" rx="12" ry="5" transform="rotate(120 16 16)" />
      </g>
    </svg>
  );
}
function NextIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 10v12M12 10l9 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
function TypeScriptIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6">
      <rect x="3" y="3" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text x="16" y="21" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">TS</text>
    </svg>
  );
}
function PythonIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor">
      <path d="M16 4c-5 0-5 3-5 3v3h5v1H8s-4 0-4 5 4 5 4 5h3v-3s0-3 3-3h5s3 0 3-3V7s0-3-6-3zm-1.6 2.2a1 1 0 110 2 1 1 0 010-2z" />
      <path d="M16 28c5 0 5-3 5-3v-3h-5v-1h8s4 0 4-5-4-5-4-5h-3v3s0 3-3 3h-5s-3 0-3 3v6s0 3 6 3zm1.6-2.2a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}
function OpenAIIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      {[0, 60, 120].map((deg) => (
        <ellipse key={deg} cx="16" cy="16" rx="11" ry="4.5" transform={`rotate(${deg} 16 16)`} />
      ))}
    </svg>
  );
}
function GeminiIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor">
      <path d="M16 3c0 8 5 13 13 13-8 0-13 5-13 13 0-8-5-13-13-13 8 0 13-5 13-13z" />
    </svg>
  );
}
function TailwindIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor">
      <path d="M9 16c1-5 3.5-7.5 7.5-7.5 4.5 0 5.5 3 7 4.5-1.5-1-3-2-6-1-2 .6-3 2-3.5 4-1-5-3.5-7.5-7.5-7.5C3 8.5 2 11.5.5 13c1.5-1 3-2 6-1 2 .6 3 2 3.5 4z" transform="translate(4 6) scale(1.1)" />
    </svg>
  );
}
function SupabaseIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor">
      <path d="M17 3 6 18h9l-1 11 12-16h-9z" />
    </svg>
  );
}
function FastAPIIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="16" cy="16" r="13" />
      <path d="M18 6 9 18h7l-3 8 10-13h-7z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const STACK = [
  { name: "Next.js", Icon: NextIcon },
  { name: "React", Icon: ReactIcon },
  { name: "TypeScript", Icon: TypeScriptIcon },
  { name: "Tailwind", Icon: TailwindIcon },
  { name: "OpenAI", Icon: OpenAIIcon },
  { name: "Gemini", Icon: GeminiIcon },
  { name: "Python", Icon: PythonIcon },
  { name: "FastAPI", Icon: FastAPIIcon },
  { name: "Supabase", Icon: SupabaseIcon },
];

// Rectangular, genuinely transparent tiles — outline only, no fill, so they
// read as a translucent watermark strip rather than solid grey boxes.
export function TechCarousel({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="marquee-track flex w-max items-center gap-sm">
        {[...STACK, ...STACK].map(({ name, Icon }, i) => (
          <div
            key={i}
            title={name}
            className="flex h-11 w-32 shrink-0 items-center justify-center gap-xs rounded-sm border border-hairline text-ink opacity-30"
          >
            <Icon />
            <span className="text-caption font-medium uppercase tracking-wide">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
