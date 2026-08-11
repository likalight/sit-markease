import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Deck } from "@/components/pitch/deck";
import { Slide } from "@/components/pitch/slide";
import { BrowserFrame } from "@/components/homepage/browser-frame";
import { ComparisonTable } from "@/components/pitch/comparison-table";
import { JOURNEY_STEPS, IMPROVEMENT_LOOP_STEPS, FEASIBILITY } from "@/lib/homepage/content";
import {
  BACKGROUND,
  PROBLEM_BULLETS,
  STAT_CALLOUT,
  SOLUTION_BULLETS,
  ANTICIPATED_IMPACT,
  FORMATIVE,
  SUMMATIVE,
  REQUEST_REVISION,
  LMS_INTEGRATION,
} from "@/lib/pitch/content";
import {
  ClockIcon,
  ChatIcon,
  EyeIcon,
  TargetIcon,
  CameraIcon,
  ShieldIcon,
  CheckCircleIcon,
  LayersIcon,
  CpuIcon,
  SearchIcon,
  CalculatorIcon,
  DatabaseIcon,
  RocketIcon,
  PencilIcon,
  RefreshIcon,
  TrendingUpIcon,
  ScaleIcon,
} from "@/components/icons";

const PROBLEM_ICONS = [ClockIcon, ChatIcon, EyeIcon, TargetIcon];
const SOLUTION_ICONS = [CameraIcon, EyeIcon, ShieldIcon];
const LOOP_ICONS = { pencil: PencilIcon, chat: ChatIcon, target: TargetIcon, refresh: RefreshIcon, "trending-up": TrendingUpIcon };
const STACK_ICONS: Record<string, typeof CpuIcon> = {
  OpenAI: CpuIcon,
  "pix2text + AWS Textract": CameraIcon,
  RAG: SearchIcon,
  SymPy: CalculatorIcon,
  Supabase: DatabaseIcon,
  "Python / FastAPI sidecar": LayersIcon,
};

export const dynamic = "force-dynamic";

// "Many," not "any" — the honest claim is that the pipeline generalises
// broadly across checkable-answer disciplines, not literally every subject
// at SIT. Computing/programming added: code with a checkable expected
// output is exactly the kind of rubric-gradeable work this pipeline
// targets, same as a worked math derivation.
const DISCIPLINES = ["Mathematics", "Physics", "Engineering", "Computing & Programming", "Nursing", "Accounting", "Business"];

const STACK = [
  {
    name: "OpenAI",
    body: "Reads the handwriting for real and grades it against the rubric — not a keyword match, an actual read.",
    featured: true,
  },
  {
    name: "pix2text + AWS Textract",
    body: "Two independent OCR hints feed the model's read; neither replaces it — the image stays ground truth.",
  },
  {
    name: "RAG",
    body: "Local embeddings over the module's own corpus ground both rubric scoring and practice generation in real material.",
  },
  {
    name: "SymPy",
    body: "Verifies the final answer symbolically wherever it's checkable — not just \"looks right.\"",
  },
  {
    name: "Supabase",
    body: "Postgres, Auth, and Storage for the whole app.",
  },
  {
    name: "Python / FastAPI sidecar",
    body: "OpenCV line detection, SymPy, and local embeddings — deployed separately from the Next.js app.",
    featured: true,
  },
];

function JourneyVisual({ step }: { step: (typeof JOURNEY_STEPS)[number] }) {
  if (!step.image) {
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
  return (
    <BrowserFrame caption="from the real review console">
      <Image src={step.image.src} alt={step.image.alt} width={step.image.width} height={step.image.height} className="max-h-[420px] w-auto rounded-md object-contain" />
    </BrowserFrame>
  );
}

function LoopVisual({ step, index }: { step: (typeof IMPROVEMENT_LOOP_STEPS)[number]; index: number }) {
  if (!step.image) {
    const Icon = LOOP_ICONS[step.icon];
    return (
      <div className="glass-card glow-border flex w-full max-w-xs flex-col items-center gap-md px-lg py-xl text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gradient-accent-2)] to-[var(--gradient-accent-3)] text-on-primary shadow-[var(--glow-primary)]">
          <Icon width={30} height={30} strokeWidth={1.6} />
        </div>
        <p className="font-mono text-caption-caps text-muted-soft">{index + 1} of {IMPROVEMENT_LOOP_STEPS.length} · the loop repeats</p>
      </div>
    );
  }
  return (
    <BrowserFrame caption="from the real student view">
      <Image src={step.image.src} alt={step.image.alt} width={step.image.width} height={step.image.height} className="max-h-[420px] w-auto rounded-md object-contain" />
    </BrowserFrame>
  );
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [attempt, feedback, practice] = IMPROVEMENT_LOOP_STEPS;
  const [reattempt, improvement] = IMPROVEMENT_LOOP_STEPS.slice(3);

  return (
    <main className="relative overflow-x-clip">
      <nav className="pointer-events-none fixed left-0 top-0 z-30 flex w-full items-center px-6 py-md">
        <Link href="/" className="pointer-events-auto flex items-center gap-xs">
          <Logo className="h-9 w-auto" />
        </Link>
      </nav>

      <Deck>
        {/* 1 — TITLE */}
        <Slide>
          <div className="flex flex-col gap-lg text-center">
            <p className="mx-auto max-w-2xl font-mono text-caption-caps text-muted-soft">Built at SIT</p>
            <h1 className="mx-auto max-w-3xl font-serif text-display-xl font-bold text-gradient">
              Photograph it. Get graded — and taught.
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
            <p className="mx-auto mt-md font-mono text-caption text-muted-soft">↓ scroll or press ↓ / space</p>
          </div>
        </Slide>

        {/* 2 — BACKGROUND / WHY */}
        <Slide eyebrow={BACKGROUND.eyebrow}>
          <div className="flex flex-col gap-md text-left">
            <h2 className="font-serif text-display-sm font-bold text-ink">{BACKGROUND.title}</h2>
            <p className="max-w-2xl text-body-md text-body">{BACKGROUND.body}</p>
            <p className="max-w-2xl border-l-2 border-primary pl-md text-body-md font-medium text-body-strong">{BACKGROUND.objective}</p>
          </div>
        </Slide>

        {/* 3 — PROBLEM */}
        <Slide eyebrow="Why this exists">
          <div className="grid gap-xl md:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col gap-md text-left">
              <h2 className="font-serif text-display-sm font-bold text-ink">
                Large-enrolment modules struggle to provide meaningful feedback on open-ended assessments.
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
            <div className="flex flex-col justify-center gap-xs text-left">
              <p className="font-serif text-display-lg font-bold text-gradient">{STAT_CALLOUT.value}</p>
              <p className="text-body-sm text-muted">{STAT_CALLOUT.body}</p>
              <p className="font-mono text-caption text-muted-soft">— {STAT_CALLOUT.citation}</p>
            </div>
          </div>
        </Slide>

        {/* 4 — SOLUTION */}
        <Slide eyebrow="Our solution">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-serif text-display-sm font-bold text-ink">
              AIMS is a human-in-the-loop pipeline — the next few slides show it read, score, and teach from one
              real submission.
            </h2>
            <ul className="flex flex-col gap-md md:flex-row md:gap-xl">
              {SOLUTION_BULLETS.map((b, i) => {
                const Icon = SOLUTION_ICONS[i];
                return (
                  <li key={b} className="glass-card flex-1 px-lg py-lg text-body-md text-body">
                    <Icon className="mb-sm text-primary" width={22} height={22} />
                    {b}
                  </li>
                );
              })}
            </ul>
          </div>
        </Slide>

        {/* 5-7 — JOURNEY: Read, Score, Teach */}
        {JOURNEY_STEPS.slice(1).map((step) => (
          <Slide key={step.label} eyebrow={`How it ${step.label.toLowerCase()}s`}>
            <div className="grid items-center gap-xl md:grid-cols-2">
              <div className="flex flex-col gap-sm text-left">
                <p className="font-mono text-caption-caps text-primary">{step.label}</p>
                <h2 className="font-serif text-display-sm font-bold text-ink">{step.title}</h2>
                <p className="max-w-md text-body-md text-body">{step.body}</p>
              </div>
              <div className="flex justify-center"><JourneyVisual step={step} /></div>
            </div>
          </Slide>
        ))}

        {/* 8 — ANTICIPATED IMPACT */}
        <Slide eyebrow={ANTICIPATED_IMPACT.eyebrow}>
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-serif text-display-sm font-bold text-ink">{ANTICIPATED_IMPACT.title}</h2>
            <div className="grid gap-md md:grid-cols-2">
              {[ANTICIPATED_IMPACT.student, ANTICIPATED_IMPACT.instructor].map((p) => (
                <div key={p.label} className="glass-card flex flex-col gap-sm px-lg py-lg">
                  <p className="text-title-sm font-semibold text-body-strong">{p.label}</p>
                  <p className="text-body-sm text-muted"><span className="font-mono text-caption-caps text-muted-soft">Today: </span>{p.before}</p>
                  <p className="text-body-sm text-body"><span className="font-mono text-caption-caps text-primary">With AIMS: </span>{p.after}</p>
                </div>
              ))}
            </div>
            <p className="max-w-2xl border-l-2 border-primary pl-md text-body-sm text-body">{ANTICIPATED_IMPACT.atScale}</p>
          </div>
        </Slide>

        {/* 9-11 — LOOP: Attempt, Feedback, Targeted Practice */}
        {[attempt, feedback, practice].map((step, i) => (
          <Slide key={step.label} eyebrow="The loop closes">
            <div className="grid items-center gap-xl md:grid-cols-2">
              <div className="flex flex-col gap-sm text-left">
                <p className="font-mono text-caption-caps text-primary">{step.label}</p>
                <h2 className="font-serif text-display-sm font-bold text-ink">{step.title}</h2>
                <p className="max-w-md text-body-md text-body">{step.body}</p>
              </div>
              <div className="flex justify-center"><LoopVisual step={step} index={i} /></div>
            </div>
          </Slide>
        ))}

        {/* 12 — LOOP: Reattempt & Improvement, combined (both icon-only) */}
        <Slide eyebrow="The loop closes">
          <div className="grid gap-xl md:grid-cols-2">
            {[reattempt, improvement].map((step, i) => (
              <div key={step.label} className="flex flex-col items-center gap-md text-center">
                <LoopVisual step={step} index={i + 3} />
                <p className="font-mono text-caption-caps text-primary">{step.label}</p>
                <h3 className="font-serif text-title-lg font-bold text-ink">{step.title}</h3>
                <p className="max-w-sm text-body-sm text-body">{step.body}</p>
              </div>
            ))}
          </div>
        </Slide>

        {/* 13 — FORMATIVE vs SUMMATIVE */}
        <Slide eyebrow="One engine, two release paths">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="max-w-2xl font-serif text-display-sm font-bold text-ink">
              Every submission takes the same first two steps. What happens next depends on what&apos;s at stake.
            </h2>
            <div className="grid gap-md md:grid-cols-2">
              <div className="flex flex-col gap-sm border-l-2 border-verified pl-md text-left">
                <p className="font-serif text-title-lg italic text-verified">{FORMATIVE.label}</p>
                <p className="text-caption-caps text-muted-soft">{FORMATIVE.plainLabel}</p>
                <p className="text-body-sm text-muted">{FORMATIVE.subLabel}</p>
                <ul className="flex flex-col gap-xs text-body-sm text-body">
                  {FORMATIVE.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
                <div className="mt-xs rounded-sm border border-hairline bg-surface-card px-md py-sm">
                  <p className="mb-xxs font-mono text-caption-caps text-muted-soft">{FORMATIVE.exampleLabel}</p>
                  <p className="mb-sm text-body-sm italic text-body">&ldquo;{FORMATIVE.example}&rdquo;</p>
                  <p className="text-caption text-muted-soft">{FORMATIVE.safeguard}</p>
                </div>
              </div>
              <div className="flex flex-col gap-sm border-l-2 border-disputed pl-md text-left">
                <p className="font-serif text-title-lg italic text-disputed">{SUMMATIVE.label}</p>
                <p className="text-caption-caps text-muted-soft">{SUMMATIVE.plainLabel}</p>
                <p className="text-body-sm text-muted">{SUMMATIVE.subLabel}</p>
                <ul className="flex flex-col gap-xs text-body-sm text-body">
                  {SUMMATIVE.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
                <div className="mt-xs rounded-sm border border-hairline bg-surface-card px-md py-sm">
                  <p className="mb-xxs font-mono text-caption-caps text-muted-soft">{SUMMATIVE.exampleLabel}</p>
                  <p className="mb-sm text-body-sm italic text-body">&ldquo;{SUMMATIVE.example}&rdquo;</p>
                  <p className="text-caption text-muted-soft">{SUMMATIVE.safeguard}</p>
                </div>
              </div>
            </div>
          </div>
        </Slide>

        {/* 14 — SCALABILITY: many disciplines */}
        <Slide dark eyebrow="Scalability">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="flex items-center gap-xs font-serif text-display-sm font-bold text-on-dark">
              <ScaleIcon className="text-primary-active" width={26} height={26} />
              Many disciplines, one pipeline
            </h2>
            <p className="max-w-xl text-body-md text-on-dark-soft">
              Only the rubric changes — the same read → score → teach pipeline applies to any module where a
              student shows checkable working. Scaling to another module at SIT is a rubric to author, not a
              rebuild.
            </p>
            <div className="flex flex-wrap items-center gap-sm">
              {DISCIPLINES.map((d) => (
                <span key={d} className="rounded-pill border border-primary-hairline bg-surface-dark-elevated px-md py-xs text-body-sm text-on-dark">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </Slide>

        {/* 15 — COMPARISON */}
        <Slide eyebrow="Existing platforms vs. AIMS">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-serif text-display-sm font-bold text-ink">
              Existing platforms vs. <span className="text-gradient">AIMS</span>
            </h2>
            <ComparisonTable />
          </div>
        </Slide>

        {/* 16 — BUILT WITH */}
        <Slide eyebrow="Built with">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-serif text-display-sm font-bold text-ink">Built with</h2>
            <div className="grid auto-rows-fr gap-md sm:grid-cols-3">
              {STACK.map((s) => {
                const Icon = STACK_ICONS[s.name];
                return (
                  <div key={s.name} className={`glass-card flex flex-col gap-xxs px-lg py-lg ${s.featured ? "sm:col-span-2" : ""}`}>
                    <Icon className="mb-xxs text-primary" width={22} height={22} />
                    <p className={`font-mono font-semibold text-ink ${s.featured ? "text-title-sm" : "text-body-sm"}`}>{s.name}</p>
                    <p className="text-body-sm text-muted">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Slide>

        {/* 17 — FEASIBILITY & FUTURE POTENTIAL */}
        <Slide eyebrow="Feasibility & future potential">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-serif text-display-sm font-bold text-ink">
              Everything so far is the live app — here&apos;s where it goes next.
            </h2>
            <div className="grid gap-xl md:grid-cols-2">
              <div>
                <p className="mb-sm flex items-center gap-xs text-title-sm font-semibold text-body-strong">
                  <CheckCircleIcon className="text-verified" width={22} height={22} />
                  {FEASIBILITY.now.title}
                </p>
                <ul className="flex flex-col gap-sm border-l-2 border-verified pl-md text-body-md text-body">
                  {FEASIBILITY.now.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div>
                <p className="mb-sm flex items-center gap-xs text-title-sm font-semibold text-body-strong">
                  <RocketIcon className="text-primary" width={22} height={22} />
                  {FEASIBILITY.next.title}
                </p>
                <ul className="flex flex-col gap-sm border-l-2 border-primary pl-md text-body-md text-body">
                  {FEASIBILITY.next.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </Slide>

        {/* 18 — LMS INTEGRATION */}
        <Slide eyebrow={LMS_INTEGRATION.eyebrow}>
          <div className="flex flex-col gap-lg text-left">
            <h2 className="max-w-2xl font-serif text-display-sm font-bold text-ink">{LMS_INTEGRATION.title}</h2>
            <p className="max-w-2xl text-body-md text-body">{LMS_INTEGRATION.body}</p>
            <div className="grid gap-md md:grid-cols-3">
              {LMS_INTEGRATION.points.map((p) => (
                <div key={p.title} className="glass-card flex flex-col gap-xxs px-lg py-lg">
                  <p className="text-body-sm font-semibold text-body-strong">{p.title}</p>
                  <p className="text-body-sm text-muted">{p.body}</p>
                  <p className="mt-xs font-mono text-caption text-muted-soft">{p.tech}</p>
                </div>
              ))}
            </div>
            <p className="max-w-2xl border-l-2 border-primary pl-md text-body-sm text-body">{LMS_INTEGRATION.note}</p>
            <p className="font-mono text-caption text-muted-soft">Source: {LMS_INTEGRATION.source}</p>
          </div>
        </Slide>

        {/* 19 — CLOSE */}
        <Slide>
          <div className="flex flex-col items-center gap-sm text-center">
            <div className="glass-card glow-border flex w-full max-w-2xl flex-col gap-sm px-lg py-xl text-center">
              <p className="font-serif text-display-sm font-bold text-ink">See it live</p>
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
              <div className="mx-auto mt-xxs flex flex-wrap justify-center gap-sm">
                <a
                  href="https://github.com/likalight/sit-markease"
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption text-muted-soft underline"
                >
                  View the code →
                </a>
              </div>
            </div>
            <p className="mt-md font-mono text-caption text-muted-soft">SIT MarkEase</p>
          </div>
        </Slide>
      </Deck>
    </main>
  );
}
