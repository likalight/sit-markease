import Image from "next/image";
import { Deck } from "@/components/pitch/deck";
import { Slide } from "@/components/pitch/slide";
import { OpenDemoButton } from "@/components/pitch/open-demo-button";
import { BrowserFrame } from "@/components/homepage/browser-frame";
import {
  BACKGROUND,
  PROBLEM_BULLETS,
  STAT_CALLOUT,
  SOLUTION_BULLETS,
  ANTICIPATED_IMPACT,
  DEVELOPMENTAL,
  EVALUATIVE,
  AI_MODE,
} from "@/lib/pitch/content";
import {
  ClockIcon,
  ChatIcon,
  EyeIcon,
  TargetIcon,
  CameraIcon,
  ShieldIcon,
  ScaleIcon,
  PencilIcon,
  CpuIcon,
} from "@/components/icons";

const PROBLEM_ICONS = [ClockIcon, ChatIcon, EyeIcon, TargetIcon];
const SOLUTION_ICONS = [CameraIcon, EyeIcon, ShieldIcon];
const MODE_ICONS = { Developmental: PencilIcon, Evaluative: ShieldIcon, AI: CpuIcon };

export const dynamic = "force-dynamic";

// "Many," not "any": the honest claim is that the pipeline generalises
// broadly across checkable-answer disciplines, not literally every subject
// at SIT.
const DISCIPLINES = ["Mathematics", "Physics", "Engineering", "Computing & Programming", "Nursing", "Accounting", "Business"];

function ModeCard({ mode, accent }: { mode: typeof DEVELOPMENTAL; accent: string }) {
  const Icon = MODE_ICONS[mode.label as keyof typeof MODE_ICONS];
  return (
    <div className={`deck-card flex flex-col gap-xs border-l-2 px-lg py-lg text-left ${accent}`}>
      <Icon className="mb-xxs text-primary" width={28} height={28} />
      <p className="font-mono text-title-lg font-bold text-ink">{mode.label}</p>
      <p className="font-mono text-body-sm text-muted-soft">{mode.plainLabel}</p>
      <ul className="mt-xs flex flex-col gap-xs text-body-md text-body">
        {mode.points.map((p) => <li key={p}>{p}</li>)}
      </ul>
    </div>
  );
}

// Two-minute live pitch, 7 slides, each one a real text+visual pairing
// (screenshots: public/step-*.png, public/loop-*.png) instead of text
// alone. Structural pattern borrowed from
// socrates-demo-chi.vercel.app/pitch (monospace type, chevron
// micro-labels, FIG.NN eyebrows, dot-grid background, thin .deck-card
// borders), colors and content entirely ours. Deck.tsx moves slides
// left/right (a horizontal carousel), not up/down, matching the "<- ->"
// nav hint literally.
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative h-dvh overflow-hidden">
      <Deck>
        {/* 1 — TITLE */}
        <Slide>
          <div className="grid items-center gap-xxl md:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-lg text-left">
              <p className="font-mono text-title-md text-muted-soft">› Built at SIT</p>
              <h1 className="font-mono text-display-xl font-bold uppercase tracking-tight text-gradient">
                Photograph it. Get graded. <span className="text-primary">Get taught.</span>
              </h1>
              <p className="max-w-lg text-title-lg text-muted">
                A human-in-the-loop pipeline for open-ended, handwritten assessment.
              </p>
              {error && (
                <p className="max-w-md rounded-sm border border-[color-mix(in_srgb,var(--color-disputed)_30%,transparent)] bg-disputed-soft px-md py-sm text-body-md text-disputed">
                  {error}
                </p>
              )}
              <p className="font-mono text-body-sm text-muted-soft">
                GROUP 15 · SIT MARKEASE · AI-POWERED GRADING &amp; FEEDBACK
              </p>
              <p className="font-mono text-body-sm text-muted-soft">→ press → or scroll to begin</p>
            </div>
            <div className="flex justify-center">
              <BrowserFrame caption="the whole grading pipeline, live">
                <Image src="/step-score.png" alt="Rubric criteria matched via RAG with point values" width={672} height={896} className="max-h-[420px] w-auto rounded-md object-contain" />
              </BrowserFrame>
            </div>
          </div>
        </Slide>

        {/* 2 — BACKGROUND + PROBLEM */}
        <Slide eyebrow={BACKGROUND.eyebrow}>
          <div className="grid gap-xl md:grid-cols-[1.2fr_0.9fr]">
            <div className="flex flex-col gap-md text-left">
              <h2 className="font-mono text-display-lg font-bold text-ink">
                SIT runs large, open-ended, hands-on modules. <span className="text-primary">Grading them well doesn&apos;t scale.</span>
              </h2>
              <ul className="flex flex-col gap-sm text-title-md">
                {PROBLEM_BULLETS.map((b, i) => {
                  const Icon = PROBLEM_ICONS[i];
                  return (
                    <li key={b} className="flex items-start gap-sm">
                      <Icon className="mt-[2px] shrink-0 text-primary" width={26} height={26} />
                      <span>{b}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex flex-col gap-md">
              <div className="deck-card flex flex-col justify-center gap-xs px-lg py-lg text-left">
                <p className="font-mono text-display-md font-bold text-gradient">{STAT_CALLOUT.value}</p>
                <p className="text-title-sm text-muted">{STAT_CALLOUT.body}</p>
                <p className="font-mono text-body-sm text-muted-soft">{STAT_CALLOUT.citation}</p>
              </div>
              <BrowserFrame caption="every line, read for real">
                <Image src="/step-read.png" alt="Reconciled transcription steps with per-step confidence" width={960} height={1195} className="max-h-[220px] w-auto rounded-md object-contain" />
              </BrowserFrame>
            </div>
          </div>
        </Slide>

        {/* 3 — SOLUTION */}
        <Slide eyebrow="Our solution">
          <div className="grid items-center gap-xl md:grid-cols-2">
            <div className="flex flex-col gap-lg text-left">
              <h2 className="font-mono text-display-lg font-bold text-ink">
                A model reads the handwriting with its own confidence attached. <span className="text-primary">A human approves every mark.</span>
              </h2>
              <ul className="flex flex-col gap-md">
                {SOLUTION_BULLETS.map((b, i) => {
                  const Icon = SOLUTION_ICONS[i];
                  return (
                    <li key={b} className="deck-card flex items-start gap-sm px-lg py-md text-title-sm text-body">
                      <Icon className="mt-[2px] shrink-0 text-primary" width={24} height={24} />
                      <span>{b}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex justify-center">
              <BrowserFrame caption="not just a mark, the exact step that went wrong">
                <Image src="/step-teach.png" alt="AI recommendation and the exact feedback the student will see" width={672} height={920} className="max-h-[460px] w-auto rounded-md object-contain" />
              </BrowserFrame>
            </div>
          </div>
        </Slide>

        {/* 4 — THREE MODES */}
        <Slide eyebrow="One engine, three release paths">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="max-w-3xl font-mono text-display-lg font-bold text-ink">
              Every submission starts the same way. <span className="text-primary">Release depends on what&apos;s at stake.</span>
            </h2>
            <div className="grid gap-md md:grid-cols-3">
              <ModeCard mode={DEVELOPMENTAL} accent="border-verified" />
              <ModeCard mode={EVALUATIVE} accent="border-disputed" />
              <ModeCard mode={AI_MODE} accent="border-primary" />
            </div>
          </div>
        </Slide>

        {/* 5 — ANTICIPATED IMPACT */}
        <Slide eyebrow={ANTICIPATED_IMPACT.eyebrow}>
          <div className="grid items-center gap-xl md:grid-cols-[1fr_0.8fr]">
            <div className="flex flex-col gap-lg text-left">
              <h2 className="font-mono text-display-lg font-bold text-ink">
                What changes for a student, <span className="text-primary">and for an instructor.</span>
              </h2>
              <div className="grid gap-md sm:grid-cols-2">
                {[ANTICIPATED_IMPACT.student, ANTICIPATED_IMPACT.instructor].map((p) => (
                  <div key={p.label} className="deck-card flex flex-col gap-sm px-lg py-lg">
                    <p className="font-mono text-title-md font-semibold text-body-strong">{p.label}</p>
                    <p className="text-body-md text-muted"><span className="font-mono text-body-sm text-muted-soft">Today: </span>{p.before}</p>
                    <p className="text-body-md text-body"><span className="font-mono text-body-sm text-primary">With AIMS: </span>{p.after}</p>
                  </div>
                ))}
              </div>
              <p className="max-w-2xl border-l-2 border-primary pl-md text-title-sm text-body">{ANTICIPATED_IMPACT.atScale}</p>
            </div>
            <div className="flex justify-center">
              <BrowserFrame caption="feedback lands, named to the exact step">
                <Image src="/loop-feedback.png" alt="AI summary, rubric, and a misconception card on the student's feedback page" width={614} height={1062} className="max-h-[420px] w-auto rounded-md object-contain" />
              </BrowserFrame>
            </div>
          </div>
        </Slide>

        {/* 6 — SCALABILITY */}
        <Slide dark eyebrow="Scalability">
          <div className="grid items-center gap-xl md:grid-cols-[1fr_0.8fr]">
            <div className="flex flex-col gap-lg text-left">
              <h2 className="flex items-center gap-sm font-mono text-display-lg font-bold text-on-dark">
                <ScaleIcon className="text-primary-active" width={34} height={34} />
                Many disciplines, <span className="text-primary-active">one pipeline.</span>
              </h2>
              <p className="max-w-xl text-title-md text-on-dark-soft">
                Only the rubric changes. The same read, score, teach pipeline applies to any module where a
                student shows checkable working.
              </p>
              <div className="flex flex-wrap items-center gap-sm">
                {DISCIPLINES.map((d) => (
                  <span key={d} className="rounded-sm border border-primary-hairline bg-surface-dark-elevated px-md py-xs font-mono text-title-sm text-on-dark">
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <BrowserFrame caption="a fresh question, built for that exact gap">
                <Image src="/loop-practice.png" alt="A practice item's scaffold tag and its verified, correctly-rendered solution" width={1446} height={184} className="w-full max-w-md rounded-md object-contain" />
              </BrowserFrame>
            </div>
          </div>
        </Slide>

        {/* 7 — CLOSE */}
        <Slide>
          <div className="flex flex-col items-center gap-md text-center">
            <p className="font-mono text-title-md text-muted-soft">› ready when you are</p>
            <div className="deck-card glow-border flex w-full max-w-2xl flex-col gap-sm px-lg py-xl text-center">
              <p className="font-mono text-display-lg font-bold text-ink">See it live</p>
              <p className="mx-auto max-w-md text-title-sm text-muted">
                One click opens two tabs: instructor and student, both already signed in.
              </p>
              <div className="mx-auto mt-sm">
                <OpenDemoButton />
              </div>
            </div>
            <div className="mt-md flex w-full max-w-2xl flex-wrap items-center justify-between gap-sm border-t border-hairline pt-sm font-mono text-title-sm text-muted-soft">
              <span>
                LIVE{" "}
                <a href="https://sit-markease.vercel.app" target="_blank" rel="noreferrer" className="underline">
                  sit-markease.vercel.app
                </a>
              </span>
              <span>
                GITHUB{" "}
                <a href="https://github.com/likalight/sit-markease" target="_blank" rel="noreferrer" className="underline">
                  github.com/likalight/sit-markease
                </a>
              </span>
            </div>
          </div>
        </Slide>
      </Deck>
    </main>
  );
}
