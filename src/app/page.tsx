import Link from "next/link";
import { Newsreader, Archivo, IBM_Plex_Mono } from "next/font/google";
import { Logo } from "@/components/logo";
import { TechCarousel } from "@/components/tech-carousel";
import { JourneyExplorer } from "@/components/journey-explorer";
import { PipelineFlow } from "@/components/pipeline-flow";
import { enterAsEducatorAction } from "@/app/enter/actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

// Landing-page-only fonts, matching aims-deck.html exactly (Newsreader
// display serif, Archivo sans, IBM Plex Mono captions). Reuses the app's
// existing --font-serif/--font-sans/--font-mono variable names so every
// font-serif/font-sans/font-mono utility class below just works — but
// applied only on this page's <main>, so the rest of the app keeps its
// Space Grotesk/Inter/JetBrains Mono system untouched. Paired with the
// `.landing-theme` color override in globals.css.
const landingSerif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const landingSans = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const landingMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

function ShapeAccent({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-2xl bg-primary opacity-[0.06] ${className}`}
    />
  );
}

export default function LandingPage() {
  return (
    <main
      className={`landing-theme flex flex-col overflow-x-clip bg-canvas ${landingSerif.variable} ${landingSans.variable} ${landingMono.variable}`}
    >
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

      {/* Hero */}
      <section className="relative mx-auto flex w-full max-w-[1160px] flex-col gap-md px-6 py-section text-center">
        <ShapeAccent className="-right-16 -top-10 h-56 w-56 rotate-12" />
        <ShapeAccent className="-left-20 top-24 h-40 w-40 -rotate-6" />
        <p className="relative mx-auto max-w-2xl font-mono text-caption-caps text-muted-soft">Built at SIT</p>
        <h1 className="relative mx-auto max-w-2xl font-serif text-display-xl text-ink">
          Photograph it. Get graded in seconds.
        </h1>
        <p className="relative mx-auto max-w-lg text-body-md text-muted">
          Any subject with a checkable answer. An AI reads your work, verifies the answer for real, and
          shows you exactly which step went wrong.
        </p>
        <div className="relative mx-auto flex flex-wrap items-center justify-center gap-sm pt-sm">
          <Link
            href="/enter/student"
            className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary"
          >
            I'm a student
          </Link>
          <form action={enterAsEducatorAction}>
            <SubmitButton
              pendingLabel="Signing in…"
              className="rounded-sm border border-hairline px-lg py-sm text-title-sm text-body"
            >
              I'm an educator
            </SubmitButton>
          </form>
        </div>
      </section>

      {/* Tech-stack marquee */}
      <TechCarousel className="mx-auto w-full max-w-[1160px] px-6 pb-lg" />

      {/* How it works — interactive flow, not a text grid */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[720px] px-6 py-section">
          <h2 className="mb-lg text-center font-serif text-display-sm text-ink">How it works</h2>
          <PipelineFlow />
        </div>
      </section>

      {/* Interactive: how the relationship works */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
        <h2 className="mb-xs text-center font-serif text-display-sm text-ink">
          Student, meet educator
        </h2>
        <p className="mx-auto mb-lg max-w-md text-center text-body-sm text-muted">
          Same submission, two jobs. Toggle roles below.
        </p>
        <JourneyExplorer />
      </section>

      {/* Why you can trust it */}
      <section className="w-full bg-surface-dark">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <h2 className="mb-md font-serif text-display-sm text-on-dark">Why you can trust the grade</h2>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-3">
            {[
              { title: "Confidence, measured", body: "Not just a final guess — every step is scored." },
              { title: "Answers, verified", body: "Checked like a calculator, not an opinion." },
              { title: "A person, when it matters", body: "Anything uncertain waits for a teacher." },
            ].map((c) => (
              <div key={c.title} className="rounded-lg border border-white/10 px-md py-md">
                <h3 className="mb-xxs text-title-md text-on-dark">{c.title}</h3>
                <p className="text-body-sm text-on-dark-soft">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why this exists — two shapes, not a paragraph */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
        <h2 className="mb-lg text-center font-serif text-display-sm text-ink">Why this exists</h2>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div className="rounded-lg border-l-4 border-l-hairline bg-surface-soft px-lg py-lg">
            <p className="mb-xs font-mono text-caption-caps text-muted-soft">The problem</p>
            <p className="text-body-md text-body">
              Large classes can't get fast, individual feedback. Students get a mark, not a reason.
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-l-primary bg-surface-soft px-lg py-lg">
            <p className="mb-xs font-mono text-caption-caps text-muted-soft">The fix</p>
            <p className="text-body-md text-body">
              Real diagnosis at scale — a person still signs off on every grade.
            </p>
          </div>
        </div>
      </section>

      {/* Where this applies */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <h2 className="mb-lg text-center font-serif text-display-sm text-ink">Not just one subject</h2>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
            {[
              { school: "Engineering", example: "Reaction forces on a loaded beam." },
              { school: "Computing", example: "Time complexity of a recursion." },
              { school: "Business", example: "Adjusting entries and net income." },
              { school: "Health Sciences", example: "The correct IV drip rate." },
            ].map((s, i) => (
              <div
                key={s.school}
                className={`rounded-lg border border-hairline bg-surface-card px-md py-md ${i % 2 === 0 ? "rotate-1" : "-rotate-1"}`}
              >
                <p className="mb-xxs font-mono text-caption-caps text-muted-soft">{s.school}</p>
                <p className="text-body-sm text-body">{s.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative mx-auto w-full max-w-[1160px] px-6 py-section text-center">
        <ShapeAccent className="-bottom-10 left-1/2 h-48 w-48 -translate-x-1/2 rotate-45" />
        <h2 className="relative mb-lg font-serif text-display-sm text-ink">Ready to try it?</h2>
        <div className="relative flex flex-wrap items-center justify-center gap-sm">
          <Link
            href="/enter/student"
            className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary"
          >
            I'm a student
          </Link>
          <form action={enterAsEducatorAction}>
            <SubmitButton
              pendingLabel="Signing in…"
              className="rounded-sm border border-hairline px-lg py-sm text-title-sm text-body"
            >
              I'm an educator
            </SubmitButton>
          </form>
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
