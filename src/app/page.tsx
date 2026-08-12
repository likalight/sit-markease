import Link from "next/link";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { startTourAction } from "@/lib/demo-tour/actions";
import { RevealSection } from "@/components/reveal-section";
import { ScrollJourney } from "@/components/homepage/scroll-journey";
import { ImprovementJourney } from "@/components/homepage/improvement-journey";
import { FEASIBILITY } from "@/lib/homepage/content";
import { ComparisonTable } from "@/components/pitch/comparison-table";
import {
  PROBLEM_BULLETS,
  STAT_CALLOUT,
  SOLUTION_BULLETS,
  IMPACT_STATEMENTS,
  FORMATIVE,
  SUMMATIVE,
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
  CircleIcon,
  LayersIcon,
  CpuIcon,
  SearchIcon,
  CalculatorIcon,
  DatabaseIcon,
  RocketIcon,
} from "@/components/icons";

const PROBLEM_ICONS = [ClockIcon, ChatIcon, EyeIcon, TargetIcon];
const SOLUTION_ICONS = [CameraIcon, EyeIcon, ShieldIcon];
const STACK_ICONS: Record<string, typeof CpuIcon> = {
  OpenAI: CpuIcon,
  "pix2text + AWS Textract": CameraIcon,
  RAG: SearchIcon,
  SymPy: CalculatorIcon,
  Supabase: DatabaseIcon,
  "Python / FastAPI sidecar": LayersIcon,
};

export const dynamic = "force-dynamic";

const DISCIPLINES = ["Mathematics", "Physics", "Engineering", "Nursing", "Accounting", "Business"];

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

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex flex-col overflow-x-clip">
      <nav className="mx-auto mb-md flex w-full max-w-[1160px] items-center px-6 py-md">
        <Link
          href="/"
          className="flex items-center gap-xs rounded-full border border-[color-mix(in_srgb,var(--color-disputed)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-disputed)_18%,white_82%)]/80 px-md py-sm shadow-[0_8px_30px_rgba(140,20,20,0.12)] backdrop-blur-md"
        >
          <Logo className="h-9 w-auto" />
        </Link>
      </nav>

      {/* HOOK — the one deliberately centered, full-impact moment. The
          guided-demo CTA lives at the very bottom now, as the closing
          action after the full story, not competing with the headline. */}
      <section className="relative mx-auto flex w-full max-w-[1160px] flex-col gap-lg px-6 py-section text-center">
        <p className="mx-auto max-w-2xl font-mono text-caption-caps text-muted-soft">Built at SIT</p>
        <h1 className="mx-auto max-w-3xl font-serif text-display-xl font-bold text-gradient">
          Photograph it. Get graded — and taught.
        </h1>
        <p className="mx-auto max-w-lg text-body-md text-muted">
          Any subject with a checkable answer — math, physics, engineering, nursing dosage calculations,
          accounting. Scroll to see exactly how it works.
        </p>

        {error && (
          <p className="relative mx-auto max-w-md rounded-sm border border-[color-mix(in_srgb,var(--color-disputed)_30%,transparent)] bg-disputed-soft px-md py-sm text-center text-body-sm text-disputed">
            {error}
          </p>
        )}
      </section>

      {/* PROBLEM */}
      <RevealSection className="w-full">
        <div className="mx-auto grid w-full max-w-[1160px] gap-xl px-6 py-section md:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-md text-left">
            <p className="font-mono text-caption-caps text-muted-soft">1 · Why this exists</p>
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
      </RevealSection>

      {/* SOLUTION — deliberately short: a pointer into the Journey below,
          which is the visual proof, not a second summary of it. */}
      <RevealSection className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section text-left">
          <p className="mb-xxs font-mono text-caption-caps text-muted-soft">2 · Our solution</p>
          <h2 className="mb-lg font-serif text-display-sm font-bold text-ink">
            AIMS is a human-in-the-loop pipeline — scroll to watch it read, score, and teach from one real
            submission.
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
      </RevealSection>

      {/* JOURNEY — the pinned Apple-product-page moment */}
      <ScrollJourney />

      {/* IMPACT — intro, then a second pinned scroll moment for the
          Attempt→Feedback→Practice→Reattempt→Improvement loop, since it's
          a real sequence (unlike Formative vs. Summative below, which is a
          comparison and stays side-by-side). */}
      <RevealSection className="w-full">
        <div className="mx-auto max-w-[1160px] px-6 pt-section text-left">
          <p className="mb-xxs font-mono text-caption-caps text-muted-soft">3 · Impact</p>
          <div className="mb-lg flex flex-col gap-sm">
            {IMPACT_STATEMENTS.map((s) => (
              <p key={s.title} className="max-w-2xl text-body-md text-body">
                <span className="font-semibold text-body-strong">{s.title}:</span> {s.body}
              </p>
            ))}
          </div>
          <p className="font-mono text-caption-caps text-muted-soft">Scroll to watch the loop close ↓</p>
        </div>
      </RevealSection>
      <ImprovementJourney />

      {/* CLIMAX — formative vs summative, full detail from the pitch */}
      <RevealSection className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <div className="mb-lg max-w-2xl text-left">
            <p className="mb-xxs font-mono text-caption-caps text-muted-soft">4 · One engine, two release paths</p>
            <h2 className="font-serif text-display-sm font-bold text-ink">
              Every submission takes the same first two steps. What happens next depends on what&apos;s at stake.
            </h2>
          </div>

          <div className="grid gap-md md:grid-cols-2">
            <div className="flex flex-col gap-sm border-l-2 border-verified pl-md text-left">
              <p className="font-serif text-title-lg italic text-verified">{FORMATIVE.label}</p>
              <p className="text-caption-caps text-muted-soft">{FORMATIVE.subLabel}</p>
              <ul className="flex flex-col gap-xs text-body-sm text-body">
                {FORMATIVE.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="mt-xs rounded-sm border border-hairline bg-surface-card px-md py-sm">
                <p className="mb-xxs font-mono text-caption-caps text-muted-soft">{FORMATIVE.exampleLabel}</p>
                <p className="mb-sm text-body-sm italic text-body">&ldquo;{FORMATIVE.example}&rdquo;</p>
                <p className="text-caption text-muted-soft">{FORMATIVE.safeguard}</p>
              </div>
            </div>
            <div className="flex flex-col gap-sm border-l-2 border-disputed pl-md text-left">
              <p className="font-serif text-title-lg italic text-disputed">{SUMMATIVE.label}</p>
              <p className="text-caption-caps text-muted-soft">{SUMMATIVE.subLabel}</p>
              <ul className="flex flex-col gap-xs text-body-sm text-body">
                {SUMMATIVE.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="mt-xs rounded-sm border border-hairline bg-surface-card px-md py-sm">
                <p className="mb-xxs font-mono text-caption-caps text-muted-soft">{SUMMATIVE.exampleLabel}</p>
                <p className="mb-sm text-body-sm italic text-body">&ldquo;{SUMMATIVE.example}&rdquo;</p>
                <p className="text-caption text-muted-soft">{SUMMATIVE.safeguard}</p>
              </div>
            </div>
          </div>

          <div className="mt-lg rounded-sm border border-hairline bg-surface-card px-lg py-md text-left">
            <p className="text-body-sm text-body">
              <span className="font-medium text-body-strong">{REQUEST_REVISION.title}:</span> {REQUEST_REVISION.body}
            </p>
          </div>
        </div>
      </RevealSection>

      {/* Comparison table */}
      <RevealSection className="w-full">
        <div className="mx-auto max-w-[1160px] px-6 py-section text-left">
          <p className="mb-xxs font-mono text-caption-caps text-muted-soft">5 · Existing platforms vs. AIMS</p>
          <h2 className="mb-lg font-serif text-display-sm font-bold text-ink">
            Existing platforms vs. <span className="text-gradient">AIMS</span>
          </h2>
          <ComparisonTable />
        </div>
      </RevealSection>

      {/* Any discipline — the one deliberate dark-maroon band before the
          midpoint, breaking the cream/peach rhythm the rest of the page
          runs on (design review: the page committed to strong color only
          in the comparison-table header and footer; borrowing that
          confidence once earlier keeps the scroll from feeling monotonous). */}
      <RevealSection className="w-full bg-surface-dark">
        <div className="mx-auto max-w-[1160px] px-6 py-section text-left">
          <p className="mb-xxs font-mono text-caption-caps text-on-dark-soft">6 · Many disciplines at SIT</p>
          <h2 className="mb-xs flex items-center gap-xs font-serif text-display-sm font-bold text-on-dark">
            <LayersIcon className="text-primary-active" width={22} height={22} />
            Many disciplines at SIT
          </h2>
          <p className="mb-lg max-w-lg text-body-sm text-on-dark-soft">
            Only the rubric changes — the same pipeline reads, grades, and diagnoses every one of them.
          </p>
          <div className="flex flex-wrap items-center gap-sm">
            {DISCIPLINES.map((d) => (
              <span key={d} className="rounded-pill border border-primary-hairline bg-surface-dark-elevated px-md py-xs text-body-sm text-on-dark">
                {d}
              </span>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* Built with */}
      <RevealSection className="mx-auto w-full max-w-[1160px] px-6 py-section">
        <p className="mb-xxs font-mono text-caption-caps text-muted-soft">7 · Built with</p>
        <h2 className="mb-lg text-left font-serif text-display-sm font-bold text-ink">Built with</h2>
        <div className="grid auto-rows-fr gap-md sm:grid-cols-3">
          {STACK.map((s) => {
            const Icon = STACK_ICONS[s.name];
            return (
              <div
                key={s.name}
                className={`glass-card flex flex-col gap-xxs px-lg py-lg ${s.featured ? "sm:col-span-2" : ""}`}
              >
                <Icon className="mb-xxs text-primary" width={22} height={22} />
                <p className={`font-mono font-semibold text-ink ${s.featured ? "text-title-sm" : "text-body-sm"}`}>
                  {s.name}
                </p>
                <p className="text-body-sm text-muted">{s.body}</p>
              </div>
            );
          })}
        </div>
      </RevealSection>

      {/* Feasibility & future potential */}
      <RevealSection className="w-full">
        <div className="mx-auto max-w-[1160px] px-6 py-section text-left">
          <p className="mb-xxs font-mono text-caption-caps text-muted-soft">8 · Feasibility &amp; future potential</p>
          <h2 className="mb-lg font-serif text-display-sm font-bold text-ink">
            Everything above is the live app — here&apos;s where it goes next.
          </h2>
          <div className="grid gap-xl md:grid-cols-2">
            <div>
              <p className="mb-sm flex items-center gap-xs text-title-sm font-semibold text-body-strong">
                <CheckCircleIcon className="text-verified" width={22} height={22} />
                {FEASIBILITY.now.title}
              </p>
              <ul className="flex flex-col gap-sm border-l-2 border-verified pl-md text-body-md text-body">
                {FEASIBILITY.now.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-sm flex items-center gap-xs text-title-sm font-semibold text-body-strong">
                <RocketIcon className="text-primary" width={22} height={22} />
                {FEASIBILITY.next.title}
              </p>
              <ul className="flex flex-col gap-sm border-l-2 border-primary pl-md text-body-md text-body">
                {FEASIBILITY.next.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* FINAL — guided demo, the closing action after the full scroll */}
      <RevealSection className="w-full bg-surface-soft">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center px-6 py-section text-center">
          <div className="glass-card glow-border flex w-full max-w-2xl flex-col gap-sm px-lg py-xl text-center">
            <p className="font-serif text-display-sm font-bold text-ink">Try a guided demo</p>
            <p className="mx-auto max-w-md text-body-sm text-muted">
              No account, no typing — one click walks you through a real submission from start to
              finish, with a real sample script.
            </p>
            <div className="mx-auto mt-xs flex flex-wrap justify-center gap-sm">
              <form action={startTourAction.bind(null, "formative")}>
                <SubmitButton pendingLabel="Starting…" className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary">
                  See the evaluative demo →
                </SubmitButton>
              </form>
              <form action={startTourAction.bind(null, "summative")}>
                <SubmitButton pendingLabel="Starting…" className="rounded-sm border border-hairline bg-canvas px-lg py-sm text-title-sm font-medium text-body">
                  See the developmental demo →
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* Footer */}
      <footer className="w-full bg-surface-dark">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-6 py-lg text-caption text-on-dark-soft">
          <span>SIT MarkEase</span>
          <a
            href="https://github.com/likalight/sit-markease"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
