import Link from "next/link";
import { db } from "@/lib/db/facade";
import { getMostRecentRealSubmission } from "@/lib/pipeline/featured-submission";
import { ScriptViewer } from "@/components/script-viewer";
import { stepState } from "@/lib/design/step-state";
import { Logo } from "@/components/logo";
import { TechCarousel } from "@/components/tech-carousel";

// Public landing page. Plain, linear, no jargon: what it is, how it works,
// why you can trust it, a real example, done.
export const dynamic = "force-dynamic";

const SHOW_LIVE_EMBED = false;

export default async function LandingPage() {
  let embed: { imageUrl: string; boxes: any[] } | null = null;
  try {
    const submissionId = await getMostRecentRealSubmission();
    const pages = submissionId ? await db.listSubmissionPages(submissionId) : [];
    const page = pages[0];
    if (submissionId && page) {
      const imageUrl = await db.getImageUrl(page.storage_path);
      const lines = await db.listDetectedLines(page.id);
      const transcription = await db.getTranscription(submissionId);
      const steps = transcription ? await db.listSolutionSteps(transcription.id) : [];
      const tags = await db.listMisconceptionTags(submissionId);
      const misconceptionStepIndices = new Set<number>(tags.flatMap((t: any) => t.evidence_step_indices));
      if (imageUrl) {
        embed = {
          imageUrl,
          boxes: lines.map((l: any) => {
            const step = steps.find((s: any) => s.line_indices.includes(l.line_index));
            return {
              lineIndex: l.line_index,
              box: l.box,
              state: step ? stepState(step.agreement, misconceptionStepIndices.has(step.step_index)) : "neutral",
            };
          }),
        };
      }
    }
  } catch {
    embed = null;
  }

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

      {/* Real example — proof first. Disabled by SHOW_LIVE_EMBED: every
          submission in the database right now is synthetic test data
          (computer-rendered text for pipeline testing, not a real
          handwriting photo) — showing it while claiming "actual output, not
          a mockup" would be misleading. Flip back on once a genuine
          photographed submission exists. */}
      {SHOW_LIVE_EMBED && embed && (
        <section className="w-full bg-surface-soft">
          <div className="mx-auto max-w-[1160px] px-6 py-section">
            <h2 className="mb-xs text-center font-serif text-display-sm text-ink">A real script, graded</h2>
            <p className="mb-lg text-center text-body-sm text-muted">
              Actual output from this build. Color shows where the two AI reads agreed.
            </p>
            <div className="mx-auto max-w-2xl">
              <ScriptViewer imageUrl={embed.imageUrl} boxes={embed.boxes} />
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
        <h2 className="mb-lg text-center font-serif text-display-sm text-ink">How it works</h2>
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-4">
          {[
            { step: "1", title: "Take a photo", body: "Students submit their own work, straight from their phone." },
            { step: "2", title: "Two AI models read it", body: "Independently. If they disagree, a human checks it." },
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

      {/* For students / for educators */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <div className="grid grid-cols-1 gap-xl sm:grid-cols-2">
            <div>
              <h2 className="mb-md font-serif text-display-sm text-ink">If you're a student</h2>
              <ul className="flex flex-col gap-sm text-body-md text-body">
                <li>• Submit your own work, no waiting on a teacher.</li>
                <li>• Grade and feedback, usually in seconds.</li>
                <li>• The exact step that went wrong, in plain English.</li>
                <li>• Practice built for your specific mistake.</li>
              </ul>
            </div>
            <div>
              <h2 className="mb-md font-serif text-display-sm text-ink">If you're an educator</h2>
              <ul className="flex flex-col gap-sm text-body-md text-body">
                <li>• Set up a question and rubric once.</li>
                <li>• Most submissions never reach your desk.</li>
                <li>• You only see the ones the AI wasn't sure about.</li>
                <li>• See which problems your whole class is getting wrong.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Where this applies */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
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
            <div key={s.school} className="rounded-sm border border-hairline px-md py-sm">
              <p className="mb-xxs text-caption-caps text-muted-soft">{s.school}</p>
              <p className="text-body-sm text-body">{s.example}</p>
            </div>
          ))}
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
