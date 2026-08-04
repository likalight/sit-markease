import Link from "next/link";
import { Logo } from "@/components/logo";
import { enterAsStudentAction, enterAsEducatorAction } from "@/app/enter/actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

function ShapeAccent({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-2xl bg-primary opacity-[0.06] ${className}`}
    />
  );
}

// The real 8-step journey (docs/DECISIONS.md, aims-deck.html) — replaces
// the old generic "how it works" diagram + interactive toggle with the
// actual pipeline, actual tool names, in actual order. Every line here is
// something the app genuinely does today, not aspirational copy.
const JOURNEY = [
  {
    n: 1,
    title: "Student submits",
    body: "A photo, a PDF, or typed LaTeX of their handwritten working.",
    tools: null,
  },
  {
    n: 2,
    title: "AI reads & scores",
    body: "pix2text and AWS Textract each independently read the script; the grading model transcribes it for real, grounded by RAG retrieval over the module's own worked examples.",
    tools: "pix2text · Textract · RAG · OpenAI",
  },
  {
    n: 3,
    title: "Instructor reviews",
    body: "The script sits beside the AI's transcription and reasoning, on one screen.",
    tools: null,
  },
  {
    n: 4,
    title: "Instructor approves & releases",
    body: "Nothing reaches a student without this explicit action — every time, no exceptions, logged to an audit trail.",
    tools: null,
  },
  {
    n: 5,
    title: "Student sees the gap",
    body: "The exact misconception, named — not just a mark taken off.",
    tools: null,
  },
  {
    n: 6,
    title: "Requests revision",
    body: "RAG retrieves relevant material for that specific gap; the AI generates a fresh practice question from it.",
    tools: "RAG · OpenAI",
  },
  {
    n: 7,
    title: "Verified before it ships",
    body: "SymPy checks it symbolically first, an LLM as fallback — anything that fails is discarded, never shown.",
    tools: "SymPy · OpenAI",
  },
  {
    n: 8,
    title: "Walks in exam-ready",
    body: "Weak points already practised — not discovered for the first time on the day.",
    tools: null,
  },
];

const STACK = ["Next.js", "Supabase", "OpenAI", "pix2text", "AWS Textract", "RAG", "SymPy", "Python / FastAPI"];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-col overflow-x-clip bg-canvas">
      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-[1160px] items-center justify-between px-6 py-md">
        <Link href="/" className="flex items-center gap-xs">
          <Logo className="h-9 w-9" />
          <span className="font-serif text-title-lg text-ink">SIT MarkEase</span>
        </Link>
        <Link href="/login" className="text-body-sm text-body underline">
          Sign in
        </Link>
      </nav>

      {/* Hero + embedded entry */}
      <section className="relative mx-auto flex w-full max-w-[1160px] flex-col gap-lg px-6 py-section">
        <ShapeAccent className="-right-16 -top-10 h-56 w-56 rotate-12" />
        <ShapeAccent className="-left-20 top-24 h-40 w-40 -rotate-6" />

        <div className="relative flex flex-col gap-md text-center">
          <p className="mx-auto max-w-2xl font-mono text-caption-caps text-muted-soft">Built at SIT</p>
          <h1 className="mx-auto max-w-2xl font-serif text-display-xl text-ink">
            Photograph it. Get graded — and taught.
          </h1>
          <p className="mx-auto max-w-lg text-body-md text-muted">
            Any subject with a checkable answer. An AI reads the work, verifies the answer for real, names
            the exact misconception, and hands back practice targeting it.
          </p>
        </div>

        {error && (
          <p className="relative mx-auto max-w-md rounded-sm border border-disputed/30 bg-disputed-soft px-md py-sm text-center text-body-sm text-disputed">
            {error}
          </p>
        )}

        <div className="relative mx-auto grid w-full max-w-2xl gap-md sm:grid-cols-2">
          <form
            action={enterAsStudentAction}
            className="flex flex-col gap-sm rounded-lg border border-hairline bg-surface-card px-lg py-lg text-left"
          >
            <p className="font-serif text-title-md text-ink">I'm a student</p>
            <p className="text-body-sm text-muted">Enter your 3-digit demo ID.</p>
            <input
              name="studentId"
              inputMode="numeric"
              maxLength={3}
              required
              placeholder="111"
              className="rounded-sm border border-hairline bg-canvas px-md py-sm text-center text-title-md tabular-nums tracking-widest"
            />
            <SubmitButton pendingLabel="Signing in…" className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary">
              Submit work
            </SubmitButton>
          </form>

          <form
            action={enterAsEducatorAction}
            className="flex flex-col gap-sm rounded-lg border border-hairline bg-surface-card px-lg py-lg text-left"
          >
            <p className="font-serif text-title-md text-ink">I'm an educator</p>
            <p className="text-body-sm text-muted">One click into the review queue — no setup needed for the demo.</p>
            <div className="flex-1" />
            <SubmitButton pendingLabel="Signing in…" className="rounded-sm border border-hairline bg-canvas px-lg py-sm text-title-sm font-medium text-body">
              Review submissions
            </SubmitButton>
          </form>
        </div>
      </section>

      {/* The real journey */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[720px] px-6 py-section">
          <h2 className="mb-xxs text-center font-serif text-display-sm text-ink">One script's journey</h2>
          <p className="mb-lg text-center text-body-sm text-muted">
            Student → AI → instructor → student again, repeating weekly, consolidating for the exam.
          </p>
          <ol className="flex flex-col gap-md">
            {JOURNEY.map((step) => (
              <li key={step.n} className="flex gap-md rounded-lg border border-hairline bg-surface-card px-lg py-md">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-pill bg-primary font-sans text-body-sm font-bold text-on-primary">
                  {step.n}
                </span>
                <div className="flex flex-col gap-xxs">
                  <div className="flex flex-wrap items-baseline gap-sm">
                    <p className="text-title-sm font-semibold text-body-strong">{step.title}</p>
                    {step.tools && (
                      <span className="rounded-sm border border-primary/30 px-xs py-[1px] font-mono text-caption text-primary">
                        {step.tools}
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Built with — real stack, plain list */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
        <h2 className="mb-md text-center font-serif text-display-sm text-ink">Built with</h2>
        <div className="flex flex-wrap items-center justify-center gap-sm">
          {STACK.map((tool) => (
            <span key={tool} className="rounded-pill border border-hairline px-md py-xs font-mono text-caption text-body">
              {tool}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-surface-dark">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-6 py-lg text-caption text-on-dark-soft">
          <span>SIT MarkEase</span>
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}
