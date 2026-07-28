import Link from "next/link";
import { Logo } from "@/components/logo";
import { TechCarousel } from "@/components/tech-carousel";
import { JourneyExplorer } from "@/components/journey-explorer";
import { enterAsEducatorAction } from "@/app/enter/actions";

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <main className="flex flex-col">
      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-[1160px] items-center justify-between px-6 py-md">
        <Link href="/" className="flex items-center gap-xs">
          <Logo className="h-9 w-9" />
          <span className="font-serif text-title-lg text-ink">Practica</span>
        </Link>
        <Link href="/login" className="text-body-sm text-body underline">
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-[1160px] flex-col gap-md px-6 py-section text-center">
        <p className="mx-auto max-w-2xl text-caption-caps text-muted-soft">
          AIMS — AI for Individualised Mastery Support, built at SIT
        </p>
        <h1 className="mx-auto max-w-3xl font-serif text-display-xl text-ink">
          Photograph your handwritten work. Get graded in seconds.
        </h1>
        <p className="mx-auto max-w-xl text-body-md text-muted">
          Any subject with a checkable answer — engineering, accounting, dosage maths, not just numbers on
          a page. An AI reads it, the answer gets verified for real, and you see exactly which step
          went wrong.
        </p>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-sm pt-sm">
          <Link
            href="/enter/student"
            className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary"
          >
            I'm a student
          </Link>
          <form action={enterAsEducatorAction}>
            <button
              type="submit"
              className="rounded-sm border border-hairline px-lg py-sm text-title-sm text-body"
            >
              I'm an educator
            </button>
          </form>
        </div>
      </section>

      {/* Tech-stack marquee */}
      <TechCarousel className="mx-auto w-full max-w-[1160px] px-6 pb-lg" />

      {/* How it works */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <h2 className="mb-lg text-center font-serif text-display-sm text-ink">How it works</h2>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-4">
            {[
              { step: "1", title: "Take a photo", body: "Submit your own work, straight from your phone or a PDF." },
              { step: "2", title: "An AI reads it", body: "Line by line, with a confidence score on every step." },
              { step: "3", title: "The answer gets verified", body: "Checked for real, like a calculator — not an opinion." },
              { step: "4", title: "Instant grade + feedback", body: "A mark, the exact step that broke, and practice for that gap." },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-xs">
                <span className="text-caption-caps text-muted-soft">Step {s.step}</span>
                <h3 className="text-title-md text-body-strong">{s.title}</h3>
                <p className="text-body-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive: how the relationship works */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
        <p className="mb-xs text-center text-caption-caps text-muted-soft">See it from both sides</p>
        <h2 className="mb-xs text-center font-serif text-display-sm text-ink">
          How the student–educator loop works
        </h2>
        <p className="mx-auto mb-lg max-w-xl text-center text-body-sm text-muted">
          Same submission, two very different jobs. Toggle roles and step through what actually happens.
        </p>
        <JourneyExplorer />
      </section>

      {/* Why you can trust it */}
      <section className="w-full bg-surface-dark">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <h2 className="mb-md font-serif text-display-sm text-on-dark">Why you can trust the grade</h2>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-3">
            <div>
              <h3 className="mb-xs text-title-md text-on-dark">Confidence is measured, not assumed</h3>
              <p className="text-body-sm text-on-dark-soft">
                The model reports how legible and confident it is on every step, not just a final
                answer. Low confidence goes to a person, not a guess.
              </p>
            </div>
            <div>
              <h3 className="mb-xs text-title-md text-on-dark">The answer is actually checked</h3>
              <p className="text-body-sm text-on-dark-soft">
                Verified for real wherever it can be — the same kind of check a calculator does, not an
                AI's opinion.
              </p>
            </div>
            <div>
              <h3 className="mb-xs text-title-md text-on-dark">A person steps in when needed</h3>
              <p className="text-body-sm text-on-dark-soft">
                Confident, verified results go out automatically. Anything uncertain waits for a teacher —
                and it's logged.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why this exists — compact, no wall of text */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section text-center">
        <h2 className="mb-xs font-serif text-display-sm text-ink">Why this exists</h2>
        <p className="mx-auto max-w-2xl text-body-md text-muted">
          Large classes can't get timely, individual feedback on open-ended work — marking doesn't scale,
          so diagnosis doesn't either, and students end up with a mark but no idea what to actually practise.
          Practica closes that loop: real diagnosis at scale, with a human always accountable for the
          grade.
        </p>
      </section>

      {/* Where this applies */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <h2 className="mb-xs text-center font-serif text-display-sm text-ink">Not just one subject</h2>
          <p className="mx-auto mb-lg max-w-xl text-center text-body-sm text-muted">
            Any question with a correct, checkable answer. Same pipeline, different rubric.
          </p>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-4">
            {[
              { school: "Engineering", example: "Find the reaction forces on this loaded beam." },
              { school: "Computing", example: "Derive the time complexity of this recursion." },
              { school: "Business", example: "Prepare the adjusting entries and net income." },
              { school: "Health Sciences", example: "Calculate the correct IV drip rate." },
            ].map((s) => (
              <div key={s.school} className="rounded-sm border border-hairline bg-surface px-md py-sm">
                <p className="mb-xxs text-caption-caps text-muted-soft">{s.school}</p>
                <p className="text-body-sm text-body">{s.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section text-center">
        <h2 className="mb-xs font-serif text-display-sm text-ink">Ready to try it?</h2>
        <p className="mx-auto mb-lg max-w-xl text-body-sm text-muted">
          Submit a real photo or PDF of handwritten work and see the grade come back.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-sm">
          <Link
            href="/enter/student"
            className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary"
          >
            I'm a student
          </Link>
          <form action={enterAsEducatorAction}>
            <button
              type="submit"
              className="rounded-sm border border-hairline px-lg py-sm text-title-sm text-body"
            >
              I'm an educator
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-surface-dark">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-6 py-lg text-caption text-on-dark-soft">
          <span>Built at SIT — Practica, for AIMS: AI for Individualised Mastery Support</span>
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}
