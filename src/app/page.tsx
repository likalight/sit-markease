import Link from "next/link";
import { db } from "@/lib/db/facade";
import { getOrCreateDemoSubmission } from "@/lib/pipeline/demo";
import { ScriptViewer } from "@/components/script-viewer";
import { stepState } from "@/lib/design/step-state";

// Public landing page — editorial density (docs/DESIGN.md §2). This is the
// pitch surface: a judge should understand the product from this page
// alone. Alternating surface rhythm per §5: cream -> cream-card -> black ->
// cream -> cream-card -> black-footer.
//
// Must be dynamic, not statically prerendered: it reads live pipeline state
// (the "real script, annotated" embed) and would otherwise bake in a
// build-time snapshot — including a local-files URL that may not even exist
// yet in a fresh environment.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let embed: { imageUrl: string; boxes: any[] } | null = null;
  try {
    const submissionId = await getOrCreateDemoSubmission();
    const pages = await db.listSubmissionPages(submissionId);
    const page = pages[0];
    if (page) {
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
    embed = null; // landing page must never hard-fail if the demo data isn't ready
  }

  return (
    <main className="flex flex-col">
      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-[1160px] items-center justify-between px-6 py-md">
        <span className="font-serif text-title-lg text-ink">Stepwise</span>
        <Link href="/login" className="text-body-sm text-body underline">
          Sign in
        </Link>
      </nav>

      {/* Hero — canvas */}
      <section className="mx-auto flex w-full max-w-[1160px] flex-col gap-md px-6 py-section text-center">
        <h1 className="mx-auto max-w-3xl font-serif text-display-xl text-ink">
          Diagnose the misconception, not just the mistake.
        </h1>
        <p className="mx-auto max-w-xl text-body-md text-muted">
          Stepwise reads a student's handwritten working, agrees with itself twice, verifies the maths
          symbolically, and hands an educator a defensible mark with evidence attached to the exact step
          that broke — in under a minute.
        </p>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-sm pt-sm">
          <a href="/demo" className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary">
            See it in action
          </a>
          <a href="/demo/student" className="rounded-sm border border-hairline px-lg py-sm text-title-sm text-body">
            Try the student view
          </a>
        </div>
      </section>

      {/* The problem — surface-soft */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section text-center">
          <p className="mx-auto max-w-2xl font-serif text-display-sm text-ink">
            280 students, six questions each: 1,680 handwritten artefacts. An educator can mark them, or
            explain to each student exactly what they misunderstood — not both.
          </p>
        </div>
      </section>

      {/* How it works — canvas */}
      <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
        <h2 className="mb-lg text-center font-serif text-display-sm text-ink">How it works</h2>
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-4">
          {[
            { step: "1", title: "Upload", body: "A phone photo of handwritten working, deskewed and line-detected." },
            { step: "2", title: "Dual-read", body: "Two independent providers transcribe it. Disagreement routes to a human." },
            { step: "3", title: "Assess", body: "Graded against the rubric with evidence; the final answer verified symbolically." },
            { step: "4", title: "Practice", body: "A targeted, verified problem set for the specific misconception found." },
          ].map((s) => (
            <div key={s.step} className="flex flex-col gap-xs">
              <span className="text-caption-caps text-muted-soft">Step {s.step}</span>
              <h3 className="text-title-md text-body-strong">{s.title}</h3>
              <p className="text-body-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The mechanism — surface-dark */}
      <section className="w-full bg-surface-dark">
        <div className="mx-auto max-w-[1160px] px-6 py-section">
          <h2 className="mb-md font-serif text-display-sm text-on-dark">
            The mechanism, not the wrapper
          </h2>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-3">
            <div>
              <h3 className="mb-xs text-title-md text-on-dark">Two independent reads</h3>
              <p className="text-body-sm text-on-dark-soft">
                A single model reading handwriting can be confidently wrong. Two models from different
                vendors, framed differently, agreeing is real evidence; disagreeing routes to a human,
                never to a student.
              </p>
            </div>
            <div>
              <h3 className="mb-xs text-title-md text-on-dark">Symbolic verification</h3>
              <p className="text-body-sm text-on-dark-soft">
                The final answer is checked symbolically wherever it can be parsed — deterministic,
                not a model's opinion — and reported as a fact the rubric-grading step must reconcile with.
              </p>
            </div>
            <div>
              <h3 className="mb-xs text-title-md text-on-dark">Human approval</h3>
              <p className="text-body-sm text-on-dark-soft">
                Nothing reaches a student without an explicit educator approval, logged to an audit trail.
                The system recommends with evidence; the human decides.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live embed — canvas */}
      {embed && (
        <section className="mx-auto w-full max-w-[1160px] px-6 py-section">
          <h2 className="mb-xs text-center font-serif text-display-sm text-ink">
            A real script, annotated
          </h2>
          <p className="mb-lg text-center text-body-sm text-muted">
            Live output from this build — not a mockup. Colour marks agreement, not a guess.
          </p>
          <div className="mx-auto max-w-2xl">
            <ScriptViewer imageUrl={embed.imageUrl} boxes={embed.boxes} />
          </div>
        </section>
      )}

      {/* Ethics — surface-soft */}
      <section className="w-full bg-surface-soft">
        <div className="mx-auto max-w-[1160px] px-6 py-section text-center">
          <h2 className="mb-xs font-serif text-display-sm text-ink">Human-in-the-loop, by design</h2>
          <p className="mx-auto max-w-xl text-body-sm text-muted">
            No mark is released without educator approval. Every approval is audit-logged. Legibility is
            measured, not penalised — low-legibility scripts route to a human instead. This is not
            autonomous grading; it is diagnosis at a scale no educator could do alone.
          </p>
        </div>
      </section>

      {/* Footer — surface-dark */}
      <footer className="w-full bg-surface-dark">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-6 py-lg text-caption text-on-dark-soft">
          <span>Built at SIT — AIMS: AI for Individualised Mastery Support</span>
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}
