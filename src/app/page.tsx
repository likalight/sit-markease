import Link from "next/link";
import { Deck } from "@/components/pitch/deck";
import { Slide } from "@/components/pitch/slide";
import { FEASIBILITY } from "@/lib/homepage/content";
import {
  BACKGROUND,
  PROBLEM_BULLETS,
  STAT_CALLOUT,
  SOLUTION_BULLETS,
  ANTICIPATED_IMPACT,
  REQUEST_REVISION,
} from "@/lib/pitch/content";
import {
  ClockIcon,
  ChatIcon,
  EyeIcon,
  TargetIcon,
  CameraIcon,
  ShieldIcon,
  CheckCircleIcon,
  RocketIcon,
  ScaleIcon,
} from "@/components/icons";

const PROBLEM_ICONS = [ClockIcon, ChatIcon, EyeIcon, TargetIcon];
const SOLUTION_ICONS = [CameraIcon, EyeIcon, ShieldIcon];

export const dynamic = "force-dynamic";

// "Many," not "any" — the honest claim is that the pipeline generalises
// broadly across checkable-answer disciplines, not literally every subject
// at SIT. Computing/programming added: code with a checkable expected
// output is exactly the kind of rubric-gradeable work this pipeline
// targets, same as a worked math derivation.
const DISCIPLINES = ["Mathematics", "Physics", "Engineering", "Computing & Programming", "Nursing", "Accounting", "Business"];

// Structural pattern borrowed from socrates-demo-chi.vercel.app/pitch —
// monospace display type, "›" chevron micro-labels, FIG.NN eyebrows
// (src/components/pitch/slide.tsx), dot-grid background (.dot-grid,
// globals.css), thin-bordered .deck-card instead of the blurred
// .glass-card used elsewhere in the app, an accent-colored closing clause
// on every headline. Content and color tokens are entirely our own — see
// the deck-nav.tsx/globals.css comments for why this wasn't a literal
// copy of their dark navy/blue theme.
//
// Trimmed to 7 slides for a 2-minute pitch (the live demo gets the
// remaining 5 minutes of a 7-minute slot). Journey/loop screenshots,
// formative-vs-summative detail, the full comparison table, and the tech
// stack all got cut as *standalone slides* here — not deleted, still real
// content in src/lib/pitch/content.ts and src/lib/homepage/content.ts —
// because the live demo right after this deck shows those exact things
// interactively; walking through static screenshots of them first just
// spends the clock twice on the same story. What's left is only what a
// judge needs before watching the real thing: why this exists, what it
// does, what changes, whether it scales, and whether it's real.
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
          <div className="flex flex-col gap-lg text-center">
            <p className="mx-auto max-w-2xl font-mono text-caption-caps text-muted-soft">› Built at SIT</p>
            <h1 className="mx-auto max-w-3xl font-mono text-display-xl font-bold uppercase tracking-tight text-gradient">
              Photograph it. Get graded — <span className="text-primary">and taught.</span>
            </h1>
            <p className="mx-auto max-w-lg text-body-md text-muted">
              A human-in-the-loop pipeline for open-ended, handwritten assessment — across every module that asks
              a student to show their working.
            </p>
            {error && (
              <p className="mx-auto max-w-md rounded-sm border border-[color-mix(in_srgb,var(--color-disputed)_30%,transparent)] bg-disputed-soft px-md py-sm text-center text-body-sm text-disputed">
                {error}
              </p>
            )}
            <p className="mx-auto mt-xs font-mono text-caption text-muted-soft">
              GROUP 15 · SIT MARKEASE · AI-POWERED GRADING &amp; FEEDBACK
            </p>
            <p className="mx-auto mt-md font-mono text-caption text-muted-soft">↓ scroll or press ↓ / space</p>
          </div>
        </Slide>

        {/* 2 — BACKGROUND + PROBLEM, merged */}
        <Slide eyebrow={BACKGROUND.eyebrow}>
          <div className="grid gap-xl md:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col gap-md text-left">
              <h2 className="font-mono text-display-sm font-bold text-ink">
                SIT runs large, open-ended, hands-on modules —{" "}
                <span className="text-primary">and grading them well doesn&apos;t scale.</span>
              </h2>
              <ul className="flex flex-col gap-sm">
                {PROBLEM_BULLETS.map((b, i) => {
                  const Icon = PROBLEM_ICONS[i];
                  return (
                    <li key={b} className="flex items-start gap-sm">
                      <Icon className="mt-[2px] shrink-0 text-primary" width={22} height={22} />
                      <span>{b}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="deck-card flex flex-col justify-center gap-xs px-lg py-lg text-left">
              <p className="font-mono text-display-lg font-bold text-gradient">{STAT_CALLOUT.value}</p>
              <p className="text-body-sm text-muted">{STAT_CALLOUT.body}</p>
              <p className="font-mono text-caption text-muted-soft">— {STAT_CALLOUT.citation}</p>
            </div>
          </div>
        </Slide>

        {/* 3 — SOLUTION */}
        <Slide eyebrow="Our solution">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-mono text-display-sm font-bold text-ink">
              A multimodal model reads the handwriting with its own confidence attached —{" "}
              <span className="text-primary">a human approves every mark.</span>
            </h2>
            <p className="font-mono text-caption-caps text-muted-soft">› what it does</p>
            <ul className="flex flex-col gap-md md:flex-row md:gap-xl">
              {SOLUTION_BULLETS.map((b, i) => {
                const Icon = SOLUTION_ICONS[i];
                return (
                  <li key={b} className="deck-card flex-1 px-lg py-lg text-body-md text-body">
                    <Icon className="mb-sm text-primary" width={22} height={22} />
                    {b}
                  </li>
                );
              })}
            </ul>
          </div>
        </Slide>

        {/* 4 — ANTICIPATED IMPACT */}
        <Slide eyebrow={ANTICIPATED_IMPACT.eyebrow}>
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-mono text-display-sm font-bold text-ink">
              What changes for a student, <span className="text-primary">and for an instructor.</span>
            </h2>
            <div className="grid gap-md md:grid-cols-2">
              {[ANTICIPATED_IMPACT.student, ANTICIPATED_IMPACT.instructor].map((p) => (
                <div key={p.label} className="deck-card flex flex-col gap-sm px-lg py-lg">
                  <p className="font-mono text-title-sm font-semibold text-body-strong">{p.label}</p>
                  <p className="text-body-sm text-muted"><span className="font-mono text-caption-caps text-muted-soft">Today: </span>{p.before}</p>
                  <p className="text-body-sm text-body"><span className="font-mono text-caption-caps text-primary">With AIMS: </span>{p.after}</p>
                </div>
              ))}
            </div>
            <p className="max-w-2xl border-l-2 border-primary pl-md text-body-sm text-body">{ANTICIPATED_IMPACT.atScale}</p>
          </div>
        </Slide>

        {/* 5 — SCALABILITY: many disciplines */}
        <Slide dark eyebrow="Scalability">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="flex items-center gap-xs font-mono text-display-sm font-bold text-on-dark">
              <ScaleIcon className="text-primary-active" width={26} height={26} />
              Many disciplines, <span className="text-primary-active">one pipeline.</span>
            </h2>
            <p className="max-w-xl text-body-md text-on-dark-soft">
              Only the rubric changes — the same read → score → teach pipeline applies to any module where a
              student shows checkable working. Scaling to another module at SIT is a rubric to author, not a
              rebuild.
            </p>
            <p className="font-mono text-caption-caps text-on-dark-soft">› applies today</p>
            <div className="flex flex-wrap items-center gap-sm">
              {DISCIPLINES.map((d) => (
                <span key={d} className="rounded-sm border border-primary-hairline bg-surface-dark-elevated px-md py-xs font-mono text-body-sm text-on-dark">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </Slide>

        {/* 6 — FEASIBILITY & FUTURE POTENTIAL, with LMS folded in as one line */}
        <Slide eyebrow="Feasibility & future potential">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-mono text-display-sm font-bold text-ink">
              Everything so far is the live app — <span className="text-primary">here&apos;s where it goes next.</span>
            </h2>
            <div className="grid gap-md md:grid-cols-2">
              <div className="deck-card px-lg py-lg">
                <p className="mb-sm flex items-center gap-xs font-mono text-title-sm font-semibold text-body-strong">
                  <CheckCircleIcon className="text-verified" width={22} height={22} />
                  {FEASIBILITY.now.title}
                </p>
                <ul className="flex flex-col gap-sm border-l-2 border-verified pl-md text-body-md text-body">
                  {FEASIBILITY.now.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div className="deck-card px-lg py-lg">
                <p className="mb-sm flex items-center gap-xs font-mono text-title-sm font-semibold text-body-strong">
                  <RocketIcon className="text-primary" width={22} height={22} />
                  {FEASIBILITY.next.title}
                </p>
                <ul className="flex flex-col gap-sm border-l-2 border-primary pl-md text-body-md text-body">
                  {FEASIBILITY.next.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            </div>
            <p className="max-w-2xl border-l-2 border-primary pl-md text-body-sm text-body">
              Next up: plugging straight into SIT&apos;s LMS (D2L Brightspace) — one-click sign-on and automatic
              grade sync, no separate site to remember.
            </p>
          </div>
        </Slide>

        {/* 7 — CLOSE */}
        <Slide>
          <div className="flex flex-col items-center gap-sm text-center">
            <p className="font-mono text-caption-caps text-muted-soft">› ready when you are</p>
            <div className="deck-card glow-border flex w-full max-w-2xl flex-col gap-sm px-lg py-xl text-center">
              <p className="font-mono text-display-sm font-bold text-ink">See it live</p>
              <p className="mx-auto max-w-md text-body-sm text-muted">
                The real app — sign in as either side and drive it yourself.
              </p>
              <div className="mx-auto mt-xs flex flex-wrap justify-center gap-sm">
                <Link
                  href="/login"
                  className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary"
                >
                  Try it as an instructor →
                </Link>
                <Link
                  href="/enter/student"
                  className="rounded-sm border border-hairline bg-canvas px-lg py-sm text-title-sm font-medium text-body"
                >
                  Try it as a student →
                </Link>
              </div>
              <p className="mx-auto mt-md max-w-md text-body-sm text-muted">{REQUEST_REVISION.body}</p>
            </div>
            <div className="mt-md flex w-full max-w-2xl flex-wrap items-center justify-between gap-sm border-t border-hairline pt-sm font-mono text-caption text-muted-soft">
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
