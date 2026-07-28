// Translucent, auto-scrolling strip of the real SIT mark — used with
// permission. Track is doubled so the CSS marquee loops seamlessly; pauses
// on hover (see .marquee-track in globals.css).
export function SitCarousel({ className = "" }: { className?: string }) {
  const items = Array.from({ length: 6 });
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="marquee-track flex w-max items-center gap-xxl opacity-[0.12]">
        {[...items, ...items].map((_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src="/sit-logo.png" alt="" aria-hidden="true" className="h-10 w-auto shrink-0 sm:h-14" />
        ))}
      </div>
    </div>
  );
}
