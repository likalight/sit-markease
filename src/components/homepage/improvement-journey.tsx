import Image from "next/image";
import { IMPROVEMENT_LOOP_STEPS } from "@/lib/homepage/content";
import { PinnedScrollSequence, type PinnedStep } from "./pinned-scroll-sequence";
import { BrowserFrame } from "./browser-frame";
import { PencilIcon, ChatIcon, TargetIcon, RefreshIcon, TrendingUpIcon } from "@/components/icons";

const ICONS = {
  pencil: PencilIcon,
  chat: ChatIcon,
  target: TargetIcon,
  refresh: RefreshIcon,
  "trending-up": TrendingUpIcon,
};

// The second pinned scroll moment — Attempt → Feedback → Targeted Practice
// → Reattempt → Improvement is a real 5-step cycle (unlike Formative vs.
// Summative below it, which is a comparison and stays side-by-side), so it
// gets the same sticky/crossfade treatment as the product-pipeline Journey
// above. 4 of 5 steps use real screenshots of the actual student pages;
// "Improvement" falls back to an icon badge since it's an aggregate concept
// with no single screen.
export function ImprovementJourney() {
  const steps: PinnedStep[] = IMPROVEMENT_LOOP_STEPS.map((step, i) => {
    const Icon = ICONS[step.icon];
    return {
      label: step.label,
      title: step.title,
      body: step.body,
      visual: step.image ? (
        <BrowserFrame caption="from the real student view">
          <Image
            src={step.image.src}
            alt={step.image.alt}
            width={step.image.width}
            height={step.image.height}
            className="max-h-[500px] w-auto rounded-md object-contain"
          />
        </BrowserFrame>
      ) : (
        <div className="glass-card glow-border flex w-full max-w-xs flex-col items-center gap-md px-lg py-xl text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gradient-accent-2)] to-[var(--gradient-accent-3)] text-on-primary shadow-[var(--glow-primary)]">
            <Icon width={30} height={30} strokeWidth={1.6} />
          </div>
          <p className="font-mono text-caption-caps text-muted-soft">
            {i + 1} of {IMPROVEMENT_LOOP_STEPS.length} · the loop repeats
          </p>
        </div>
      ),
    };
  });

  return <PinnedScrollSequence steps={steps} />;
}
