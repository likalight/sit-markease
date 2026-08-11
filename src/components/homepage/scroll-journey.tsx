import Image from "next/image";
import { JOURNEY_STEPS } from "@/lib/homepage/content";
import { PinnedScrollSequence, type PinnedStep } from "./pinned-scroll-sequence";
import { BrowserFrame } from "./browser-frame";
import { CameraIcon } from "@/components/icons";

// The "Apple product page" moment: the visual crossfades between a distinct
// shot per step (not one static screenshot reused four times) while the
// caption crossfades alongside it, via the shared PinnedScrollSequence
// engine (also used by the Impact/Improvement-loop journey further down
// the page).
export function ScrollJourney() {
  const steps: PinnedStep[] = JOURNEY_STEPS.map((step) => ({
    label: step.label,
    title: step.title,
    body: step.body,
    visual: step.image ? (
      <BrowserFrame caption="from the real review console">
        <Image
          src={step.image.src}
          alt={step.image.alt}
          width={step.image.width}
          height={step.image.height}
          className="max-h-[500px] w-auto rounded-md object-contain"
        />
      </BrowserFrame>
    ) : (
      <SubmitIllustration />
    ),
  }));

  return <PinnedScrollSequence steps={steps} />;
}

// No live screenshot of the raw upload moment exists (it's a bare file
// input) — an honest illustration instead of pretending this is captured
// product UI. Deliberately not wrapped in "not a mockup" framing, unlike
// the real screenshots above it.
function SubmitIllustration() {
  return (
    <div className="glass-card glow-border flex w-full max-w-xs flex-col items-center gap-md px-lg py-xl text-center">
      <CameraIcon width={56} height={56} className="text-primary" strokeWidth={1.4} />
      <div>
        <p className="font-mono text-caption-caps text-muted-soft">IMG_2847.jpg</p>
        <p className="mt-xxs text-body-sm text-muted">A phone photo of the handwritten page — that&apos;s the entire input.</p>
      </div>
    </div>
  );
}
