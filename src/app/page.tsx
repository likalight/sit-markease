import Image from "next/image";
import Link from "next/link";
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
  DEVELOPMENTAL,
  EVALUATIVE,
  AI_MODE,
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
  RocketIcon,
  ScaleIcon,
  PencilIcon,
  RefreshIcon,
  TrendingUpIcon,
  CpuIcon,
  SearchIcon,
  CalculatorIcon,
  DatabaseIcon,
  LayersIcon,
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

const STACK = [
  { name: "OpenAI", body: "Reads the handwriting for real and grades it against the rubric — not a keyword match, an actual read.", featured: true },
  { name: "pix2text + AWS Textract", body: "Two independent OCR hints feed the model's read; neither replaces it — the image stays ground truth." },
  { name: "RAG", body: "Local embeddings over the module's own corpus ground both rubric scoring and practice generation in real material." },
  { name: "SymPy", body: "Verifies the final answer symbolically wherever it's checkable — not just \"looks right.\"" },
  { name: "Supabase", body: "Postgres, Auth, and Storage for the whole app." },
  { name: "Python / FastAPI sidecar", body: "OpenCV line detection, SymPy, and local embeddings — deployed separately from the Next.js app.", featured: true },
];

export const dynamic = "force-dynamic";

// "Many," not "any" — the honest claim is that the pipeline generalises
// broadly across checkable-answer disciplines, not literally every subject
// at SIT. Computing/programming added: code with a checkable expected
// output is exactly the kind of rubric-gradeable work this pipeline
// targets, same as a worked math derivation.
const DISCIPLINES = ["Mathematics", "Physics", "Engineering", "Computing & Programming", "Nursing", "Accounting", "Business"];

function JourneyVisual({ step }: { step: (typeof JOURNEY_STEPS)[number] }) {
  if (!step.image) {
    return (
      <div className="deck-card flex w-full max-w-xs flex-col items-center gap-md px-lg py-xl text-center">
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
      <Image src={step.image.src} alt={step.image.alt} width={step.image.width} height={step.image.height} className="max-h-[380px] w-auto rounded-md object-contain" />
    </BrowserFrame>
  );
}

function LoopVisual({ step, index }: { step: (typeof IMPROVEMENT_LOOP_STEPS)[number]; index: number }) {
  if (!step.image) {
    const Icon = LOOP_ICONS[step.icon];
    return (
      <div className="deck-card flex w-full max-w-xs flex-col items-center gap-md px-lg py-xl text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gradient-accent-2)] to-[var(--gradient-accent-3)] text-on-primary shadow-[var(--glow-primary)]">
          <Icon width={30} height={30} strokeWidth={1.6} />
        </div>
        <p className="font-mono text-caption-caps text-muted-soft">{index + 1} of {IMPROVEMENT_LOOP_STEPS.length} · the loop repeats</p>
      </div>
    );
  }
  return (
    <BrowserFrame caption="from the real student view">
      <Image src={step.image.src} alt={step.image.alt} width={step.image.width} height={step.image.height} className="max-h-[380px] w-auto rounded-md object-contain" />
    </BrowserFrame>
  );
}

function ModeCard({ mode, accent }: { mode: typeof DEVELOPMENTAL; accent: string }) {
  return (
    <div className={`deck-card flex flex-col gap-sm border-l-2 px-lg py-lg text-left ${accent}`}>
      <p className="font-mono text-title-lg font-bold text-ink">{mode.label}</p>
      <p className="font-mono text-caption-caps text-muted-soft">{mode.plainLabel}</p>
      <p className="text-body-sm text-muted">{mode.subLabel}</p>
      <ul className="flex flex-col gap-xs text-body-sm text-body">
        {mode.points.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <div className="mt-xs rounded-sm border border-hairline bg-canvas px-md py-sm">
        <p className="mb-xxs font-mono text-caption-caps text-muted-soft">{mode.exampleLabel}</p>
        <p className="mb-sm text-body-sm italic text-body">&ldquo;{mode.example}&rdquo;</p>
        <p className="text-caption text-muted-soft">{mode.safeguard}</p>
      </div>
    </div>
  );
}

// Structural pattern borrowed from socrates-demo-chi.vercel.app/pitch —
// monospace display type, "›" chevron micro-labels, FIG.NN eyebrows
// (src/components/pitch/slide.tsx), dot-grid background (.dot-grid,
// globals.css), thin-bordered .deck-card instead of the blurred
// .glass-card used elsewhere in the app, an accent-colored closing clause
// on every headline. Content and color tokens are entirely our own.
//
// Expanded back out to a long-form deck (18 slides) — everything that was
// cut for a 2-minute timed pitch (the Read/Score/Teach journey, the
// Attempt->Feedback->Practice loop, the full 3-mode breakdown, the
// comparison table, the tech stack) is back as real slides, restyled.
// This version is the "browse it yourself" reference deck; docs/DEMO_PLAN.md
// covers pacing a shorter live walkthrough separately if the actual timed
// slot still needs one.
export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [attempt, feedback, practice] = IMPROVEMENT_LOOP_STEPS;
  const [reattempt, improvement] = IMPROVEMENT_LOOP_STEPS.slice(3);

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

        {/* 2 — BACKGROUND + PROBLEM */}
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

        {/* 4-6 — JOURNEY: Read, Score, Teach */}
        {JOURNEY_STEPS.slice(1).map((step) => (
          <Slide key={step.label} eyebrow={`How it ${step.label.toLowerCase()}s`}>
            <div className="grid items-center gap-xl md:grid-cols-2">
              <div className="flex flex-col gap-sm text-left">
                <p className="font-mono text-caption-caps text-primary">› {step.label}</p>
                <h2 className="font-mono text-display-sm font-bold text-ink">{step.title}</h2>
                <p className="max-w-md text-body-md text-body">{step.body}</p>
              </div>
              <div className="flex justify-center"><JourneyVisual step={step} /></div>
            </div>
          </Slide>
        ))}

        {/* 7 — ANTICIPATED IMPACT */}
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

        {/* 8-10 — LOOP: Attempt, Feedback, Targeted Practice */}
        {[attempt, feedback, practice].map((step, i) => (
          <Slide key={step.label} eyebrow="The loop closes">
            <div className="grid items-center gap-xl md:grid-cols-2">
              <div className="flex flex-col gap-sm text-left">
                <p className="font-mono text-caption-caps text-primary">› {step.label}</p>
                <h2 className="font-mono text-display-sm font-bold text-ink">{step.title}</h2>
                <p className="max-w-md text-body-md text-body">{step.body}</p>
              </div>
              <div className="flex justify-center"><LoopVisual step={step} index={i} /></div>
            </div>
          </Slide>
        ))}

        {/* 11 — LOOP: Reattempt & Improvement */}
        <Slide eyebrow="The loop closes">
          <div className="grid gap-xl md:grid-cols-2">
            {[reattempt, improvement].map((step, i) => (
              <div key={step.label} className="flex flex-col items-center gap-md text-center">
                <LoopVisual step={step} index={i + 3} />
                <p className="font-mono text-caption-caps text-primary">› {step.label}</p>
                <h3 className="font-mono text-title-lg font-bold text-ink">{step.title}</h3>
                <p className="max-w-sm text-body-sm text-body">{step.body}</p>
              </div>
            ))}
          </div>
        </Slide>

        {/* 12 — THREE MODES */}
        <Slide eyebrow="One engine, three release paths">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="max-w-2xl font-mono text-display-sm font-bold text-ink">
              Every submission starts the same way. <span className="text-primary">Who&apos;s watching release is the instructor&apos;s call.</span>
            </h2>
            <div className="grid gap-md md:grid-cols-3">
              <ModeCard mode={DEVELOPMENTAL} accent="border-verified" />
              <ModeCard mode={EVALUATIVE} accent="border-disputed" />
              <ModeCard mode={AI_MODE} accent="border-primary" />
            </div>
          </div>
        </Slide>

        {/* 13 — SCALABILITY */}
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

        {/* 14 — COMPARISON */}
        <Slide eyebrow="Existing platforms vs. AIMS">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-mono text-display-sm font-bold text-ink">
              Existing platforms vs. <span className="text-primary">AIMS.</span>
            </h2>
            <ComparisonTable />
          </div>
        </Slide>

        {/* 15 — BUILT WITH */}
        <Slide eyebrow="Built with">
          <div className="flex flex-col gap-lg text-left">
            <h2 className="font-mono text-display-sm font-bold text-ink">Built with</h2>
            <div className="grid auto-rows-fr gap-md sm:grid-cols-3">
              {STACK.map((s) => {
                const Icon = STACK_ICONS[s.name];
                return (
                  <div key={s.name} className={`deck-card flex flex-col gap-xxs px-lg py-lg ${s.featured ? "sm:col-span-2" : ""}`}>
                    <Icon className="mb-xxs text-primary" width={22} height={22} />
                    <p className={`font-mono font-semibold text-ink ${s.featured ? "text-title-sm" : "text-body-sm"}`}>{s.name}</p>
                    <p className="text-body-sm text-muted">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Slide>

        {/* 16 — FEASIBILITY & FUTURE POTENTIAL */}
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
          </div>
        </Slide>

        {/* 17 — LMS INTEGRATION */}
        <Slide eyebrow={LMS_INTEGRATION.eyebrow}>
          <div className="flex flex-col gap-lg text-left">
            <h2 className="max-w-2xl font-mono text-display-sm font-bold text-ink">{LMS_INTEGRATION.title}</h2>
            <p className="max-w-2xl text-body-md text-body">{LMS_INTEGRATION.body}</p>
            <div className="grid gap-md md:grid-cols-3">
              {LMS_INTEGRATION.points.map((p) => (
                <div key={p.title} className="deck-card flex flex-col gap-xxs px-lg py-lg">
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

        {/* 18 — CLOSE */}
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
