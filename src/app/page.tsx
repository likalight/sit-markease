import Link from "next/link";
import { Logo } from "@/components/logo";
import { DemoEntry } from "@/components/demo-entry";

export const dynamic = "force-dynamic";

function ShapeAccent({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-2xl bg-primary opacity-[0.06] ${className}`}
    />
  );
}

const PROBLEMS = [
  {
    title: "Manual grading doesn't scale",
    body: "Large-enrolment modules can't give timely, individual feedback on open-ended, handwritten work — not at real class sizes.",
  },
  {
    title: "Feedback collapses into a mark",
    body: "A number and a tick tell a student they got it wrong. They don't tell them why, or what to do about it.",
  },
  {
    title: "No practice targets the actual gap",
    body: "Generic revision material isn't the same as a fresh question built for the exact misconception a student just showed.",
  },
];

const DISCIPLINES = ["Mathematics", "Physics", "Engineering", "Nursing", "Accounting", "Business"];

const STACK = [
  {
    name: "OpenAI",
    body: "Reads the handwriting for real and grades it against the rubric — not a keyword match, an actual read.",
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
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-col overflow-x-clip bg-canvas">
      {/* Nav — brand only. The two real entry points live in the hero below;
          repeating them here was redundant clutter, not a shortcut. */}
      <nav className="mx-auto flex w-full max-w-[1160px] items-center px-6 py-md">
        <Link href="/" className="flex items-center gap-xs">
          <Logo className="h-9 w-9" />
          <span className="font-serif text-title-lg text-ink">SIT MarkEase</span>
        </Link>
      </nav>

      {/* Hero + embedded entry */}
      <section className="relative mx-auto flex w-full max-w-[1160px] flex-col gap-lg px-6 py-section">
        <ShapeAccent className="-right-16 -top-10 h-56 w-56 rotate-12" />
        <ShapeAccent className="-left-20 top-24 h-40 w-40 -rotate-6" />

        <div className="relative flex flex-col gap-md text-center">
          <p className="mx-auto max-w-2xl font-mono text-caption-caps text-muted-soft">Public reviewer prototype</p>
          <h1 className="mx-auto max-w-2xl font-serif text-display-xl text-ink">
            A guided demo of AI grading, review, and targeted practice.
          </h1>
          <p className="mx-auto max-w-lg text-body-md text-muted">
            Start as the instructor or student, switch roles any time, and use built-in demo scripts so no reviewer
            has to upload or download anything.
          </p>
        </div>

        {error && (
          <p className="relative mx-auto max-w-md rounded-sm border border-disputed/30 bg-disputed-soft px-md py-sm text-center text-body-sm text-disputed">
            {error}
          </p>
        )}

        <DemoEntry />
      </section>

      {/* The problem */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[960px] px-6 py-section">
          <h2 className="mb-lg text-center font-serif text-display-sm text-ink">Why this exists</h2>
          <div className="grid gap-md sm:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-lg border border-hairline bg-surface-card px-lg py-lg">
                <p className="mb-xs text-title-sm font-semibold text-body-strong">{p.title}</p>
                <p className="text-body-sm text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two paths, one engine — the real current architecture, not the old
          linear 8-step flow this section used to describe. */}
      <section className="w-full">
        <div className="mx-auto max-w-[960px] px-6 py-section">
          <h2 className="mb-xxs text-center font-serif text-display-sm text-ink">One engine, two release paths</h2>
          <p className="mb-lg text-center text-body-sm text-muted">
            Every submission takes the same first step. What happens next depends on what's at stake.
          </p>

          <div className="mb-md flex flex-col items-center gap-xs rounded-lg border border-hairline bg-surface-card px-lg py-md text-center">
            <p className="text-title-sm font-semibold text-body-strong">Submit → AI reads, scores &amp; writes feedback</p>
            <p className="font-mono text-caption text-muted-soft">pix2text · Textract · RAG · OpenAI · SymPy check</p>
          </div>

          <div className="mb-md grid gap-md sm:grid-cols-2">
            <div className="rounded-lg border border-hairline bg-surface-card px-lg py-lg">
              <p className="mb-xxs font-serif text-title-md italic text-verified">Formative</p>
              <p className="mb-sm text-caption-caps text-muted-soft">Weekly practice</p>
              <ul className="flex flex-col gap-xs text-body-sm text-body">
                <li>Releases instantly — no instructor gate, no confidence check.</li>
                <li>A guiding question, not the answer — Socratic-style hints.</li>
                <li>Revise and resubmit the same question, as many times as it takes.</li>
                <li>Every attempt logged for the instructor to review later.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-card px-lg py-lg">
              <p className="mb-xxs font-serif text-title-md italic text-disputed">Summative</p>
              <p className="mb-sm text-caption-caps text-muted-soft">Closed-book CA / exam</p>
              <ul className="flex flex-col gap-xs text-body-sm text-body">
                <li>Instructor reviews, grouped by question, lowest-confidence first.</li>
                <li>Can adjust the score or the read transcription directly.</li>
                <li>Approves the mark and the exact feedback text before release.</li>
                <li>Nothing reaches the student without that explicit action.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-surface-soft px-lg py-md text-center">
            <p className="text-body-sm text-body">
              <span className="font-medium text-body-strong">Either way:</span> once it's graded, the student can
              request a fresh, verified practice set targeting the specific gap — checked by SymPy or an LLM before
              anything ships.
            </p>
          </div>
        </div>
      </section>

      {/* Any discipline at SIT */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[960px] px-6 py-section text-center">
          <h2 className="mb-xs font-serif text-display-sm text-ink">Any discipline at SIT</h2>
          <p className="mb-lg text-body-sm text-muted">
            Only the rubric changes — the same pipeline reads, grades, and diagnoses every one of them.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-sm">
            {DISCIPLINES.map((d) => (
              <span key={d} className="rounded-pill border border-hairline bg-surface-card px-md py-xs text-body-sm text-body">
                {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Built with — explained, not just name-dropped */}
      <section className="mx-auto w-full max-w-[960px] px-6 py-section">
        <h2 className="mb-lg text-center font-serif text-display-sm text-ink">Built with</h2>
        <div className="grid gap-md sm:grid-cols-2">
          {STACK.map((s) => (
            <div key={s.name} className="flex flex-col gap-xxs">
              <p className="font-mono text-body-sm font-semibold text-ink">{s.name}</p>
              <p className="text-body-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

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
