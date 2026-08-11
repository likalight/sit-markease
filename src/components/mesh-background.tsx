// Ambient ember gradient mesh — mounted once in the root layout so every
// page gets it for free. Pure CSS blurred blobs, no canvas/WebGL/particle
// engine: cheaper, and the drift animation is fully GPU-composited
// (transform only). Freezes under prefers-reduced-motion via the
// .mesh-background rule in globals.css. Opacity is much lower than a
// dark-canvas version would use — a bright glow reads as light emanating
// against near-black, but as a muddy smudge on cream; here it's a soft
// warm wash instead, with a multiply blend so it tints rather than covers.
export function MeshBackground() {
  return (
    <div
      className="mesh-background pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ mixBlendMode: "multiply" }}
      aria-hidden
    >
      <div
        className="absolute -left-[10%] -top-[15%] h-[60vw] w-[60vw] rounded-full opacity-[0.12] blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--gradient-accent-1), transparent 70%)",
          animation: "mesh-drift-a 32s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -right-[15%] top-[10%] h-[50vw] w-[50vw] rounded-full opacity-[0.1] blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--gradient-accent-2), transparent 70%)",
          animation: "mesh-drift-b 26s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[20%] h-[55vw] w-[55vw] rounded-full opacity-[0.08] blur-[120px]"
        style={{
          background: "radial-gradient(circle, var(--gradient-accent-3), transparent 70%)",
          animation: "mesh-drift-c 38s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes mesh-drift-a {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(6%, 8%) scale(1.1); }
        }
        @keyframes mesh-drift-b {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(-8%, 6%) scale(1.05); }
        }
        @keyframes mesh-drift-c {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(4%, -6%) scale(1.08); }
        }
      `}</style>
    </div>
  );
}
