import Link from "next/link";
import { Logo } from "@/components/logo";
import { TechCarousel } from "@/components/tech-carousel";
import { JourneyExplorer } from "@/components/journey-explorer";

// Public landing page. Comprehensive by design: the full brief, an
// interactive walk-through of both roles, and a clear line from problem to
// mechanism — not a trimmed-down teaser.
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
          AIMS — An AI-Assisted Framework for Scalable Feedback and Targeted Practice in Open-Ended
          Assessments
        </p>
        <h1 className="mx-auto max-w-3xl font-serif text-display-xl text-ink">
          Photograph your handwritten work. Get graded in seconds.
        </h1>
        <p className="mx-auto max-w-xl text-body-md text-muted">
          Any subject with a checkable answer — engineering, accounting, dosage maths, not just numbers on
          a page. Two AI models read it, the answer gets verified for real, and the student sees exactly
          which step went wrong.
        </p>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-sm pt-sm">
          <a href="/login" className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary">
            I'm a student
          </a>
          <a href="/login" className="rounded-sm border border-hairline px-lg py-sm text-title-sm text-body">
            I'm an educator
          </a>
        </div>
      </section>

      {/* Tech-stack marquee */}
      <TechCarousel className="mx-auto w-full max-w-[1160px] px-6 pb-lg" />

      {/* The brief — the real problem this was built against, verbatim */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <p className="mb-xs text-center text-caption-caps text-muted-soft">The brief</p>
          <h2 className="mb-lg text-center font-serif text-display-sm text-ink">
            The problem this was built to solve
          </h2>

          <div className="mx-auto max-w-3xl rounded-lg border border-hairline bg-surface p-lg">
            <p className="mb-xxs text-caption-caps text-muted-soft">Project</p>
            <p className="mb-md text-title-md text-body-strong">
              AI-Assisted Framework for Scalable Feedback and Targeted Practice in Open-Ended Assessments
            </p>

            <p className="mb-xxs text-caption-caps text-muted-soft">Problem statement</p>
            <p className="mb-sm text-body-md text-body">
              Large-enrolment modules cannot provide timely, individualised feedback on open-ended
              assessments. Two failures compound.
            </p>
            <p className="mb-sm text-body-md text-body">
              <span className="font-medium text-body-strong">Educator side.</span> Marking multi-step
              derivations is slow and cognitively expensive. 280 students × 6 questions = 1,680 artefacts
              per assessment. Under time pressure, feedback collapses into a mark and a tick, or a recycled
              generic comment. Consistency drifts across multiple TAs. By the time scripts are returned,
              teaching has moved on and the feedback is inert.
            </p>
            <p className="mb-md text-body-md text-body">
              <span className="font-medium text-body-strong">Student side.</span> Even with a mark, a
              student cannot answer the only question that matters: what exactly do I not understand, and
              what should I practise next? They get a chapter, not the four problems targeting their
              specific error. Self-directed practice becomes undirected practice.
            </p>
            <p className="mb-lg rounded-sm border border-primary bg-primary-soft px-md py-sm text-body-md font-medium text-body-strong">
              The gap is not that marking is hard. It is that diagnosis does not scale — and without
              diagnosis, practice cannot be targeted.
            </p>

            <p className="mb-xxs text-caption-caps text-muted-soft">Proposed AI solution</p>
            <p className="mb-md text-body-md text-body">
              A pipeline that reads a photographed script the way a human marker would — line by line,
              cross-checked by two independent AI models rather than one — grades it against a real rubric
              with cited evidence for every mark, names the specific misconception behind each mistake, and
              generates fresh, verified practice problems targeting that exact gap. A human always makes the
              final call on anything the system isn't confident about; nothing reaches a student without
              either strong agreement between the two independent reads or explicit educator approval.
            </p>

            <p className="mb-xxs text-caption-caps text-muted-soft">Expected impact</p>
            <ul className="flex flex-col gap-xxs text-body-md text-body">
              <li>• Educator time per script cut from minutes to under a minute — reviewing, not marking from scratch.</li>
              <li>• Feedback that's specific and actionable: it cites the student's own step and names the misconception, not a generic comment.</li>
              <li>• A closed loop — diagnosis leads straight into targeted practice, not a chapter to re-read.</li>
              <li>• Every mark stays human-accountable and auditable, and the same mechanism generalises to any rubric-graded subject, not just maths.</li>
            </ul>
          </div>

          <p className="mx-auto mt-lg max-w-2xl text-center text-body-md text-muted">
            <span className="font-medium text-body-strong">How Practica bridges it:</span> the mechanism
            below is that pipeline, built and running. Two independent AI reads instead of one, a real
            symbolic check on the final answer instead of a guess, and a human reviewing only the cases that
            are actually uncertain — so grading finally scales without losing what made it trustworthy.
          </p>
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
              <h3 className="mb-xs text-title-md text-on-dark">Never just one model's word</h3>
              <p className="text-body-sm text-on-dark-soft">
                One AI reading handwriting can be confidently wrong. Two agreeing is real evidence.
                Disagreeing goes to a person, not a guess.
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

      {/* What this is not */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
        <h2 className="mb-xs text-center font-serif text-display-sm text-ink">What this isn't</h2>
        <p className="mx-auto mb-lg max-w-xl text-center text-body-sm text-muted">
          Just as important as what it does.
        </p>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          {[
            { title: "Not autonomous grading", body: "No mark is ever released without either strong two-model agreement or explicit educator approval." },
            { title: "Not proctoring or AI-detection", body: "It doesn't watch for cheating or flag AI-written answers — it grades the work it's given." },
            { title: "Not an LMS replacement", body: "It's a grading and diagnosis layer, not a place to run a whole course." },
            { title: "Not a chatbot tutor", body: "It generates verified practice problems for a specific gap — it doesn't hold open-ended conversations." },
          ].map((n) => (
            <div key={n.title} className="rounded-sm border border-hairline px-md py-sm">
              <p className="mb-xxs text-title-sm text-body-strong">{n.title}</p>
              <p className="text-body-sm text-muted">{n.body}</p>
            </div>
          ))}
        </div>
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
          Sign up, submit a real photo or PDF of handwritten work, and see the grade come back.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-sm">
          <a href="/login" className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary">
            I'm a student
          </a>
          <a href="/login" className="rounded-sm border border-hairline px-lg py-sm text-title-sm text-body">
            I'm an educator
          </a>
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
