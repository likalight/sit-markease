"use client";

// docs/DESIGN.md §3 `script-viewer` — the emotional core. Student's
// handwriting on a Dynamic Black backdrop, step regions overlaid in
// semantic colour (never `primary` — red is scarce, see §1.2).
export type StepState = "verified" | "attention" | "disputed" | "neutral";

// Tailwind's opacity modifier needs an rgb-tuple theme value to compose
// cleanly with arbitrary CSS custom properties; the pre-mixed `-soft` tokens
// (docs/DESIGN.md §1.1) give the same "fill without obscuring the
// handwriting" effect without depending on that behaviour.
const FILL: Record<StepState, string> = {
  verified: "bg-verified-soft border-verified opacity-50",
  attention: "bg-attention-soft border-attention opacity-50",
  disputed: "bg-disputed-soft border-disputed opacity-50",
  neutral: "bg-transparent border-transparent",
};

const FILL_ACTIVE: Record<StepState, string> = {
  verified: "bg-verified-soft border-verified opacity-100",
  attention: "bg-attention-soft border-attention opacity-100",
  disputed: "bg-disputed-soft border-disputed opacity-100",
  neutral: "bg-transparent border-transparent",
};

export interface ScriptViewerBox {
  lineIndex: number;
  box: { x: number; y: number; w: number; h: number };
  state: StepState;
}

export function ScriptViewer({
  imageUrl,
  boxes,
  activeLineIndices,
  onBoxClick,
}: {
  imageUrl: string;
  boxes: ScriptViewerBox[];
  activeLineIndices?: Set<number>;
  onBoxClick?: (lineIndex: number) => void;
}) {
  return (
    <div className="rounded-lg bg-surface-dark p-4">
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="student submission" className="block max-w-full rounded-sm" />
        {boxes.map((b) => {
          const active = activeLineIndices?.has(b.lineIndex);
          const cls = active ? FILL_ACTIVE[b.state] : FILL[b.state];
          return (
            <div
              key={b.lineIndex}
              onClick={onBoxClick ? () => onBoxClick(b.lineIndex) : undefined}
              className={`absolute rounded-sm border-[1.5px] transition-colors ${cls} ${onBoxClick ? "cursor-pointer" : ""}`}
              style={{
                left: `${b.box.x * 100}%`,
                top: `${b.box.y * 100}%`,
                width: `${b.box.w * 100}%`,
                height: `${b.box.h * 100}%`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
