import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { FeedbackFlagButton } from "@/components/feedback-flag-button";

// §11.1 S1 — student feedback view. Mark + criterion bars, annotated script
// with the breakdown step(s) highlighted, feedback blocks, misconception
// cards with an expandable explainer, "was this helpful?" flag, and a link
// into the practice set (S2, /practice/[submissionId]).
export default async function StudentFeedbackPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const allSubmissions = await db.listAllSubmissions();
  const mine = allSubmissions.filter((s: any) => s.student_id === user.id);

  const cards = await Promise.all(
    mine.map(async (submission: any) => {
      const grade = await db.getGradeRecommendation(submission.id);
      const feedback = await db.getFeedback(submission.id);
      if (!feedback || !grade) return null;

      const criteria = await db.listCriterionResults(grade.id);
      const question = await db.getQuestionWithRubric(submission.question_id);
      const nameByKey = Object.fromEntries((question?.criteria ?? []).map((c: any) => [c.key, c.name]));

      const pages = await db.listSubmissionPages(submission.id);
      const page = pages[0];
      const originalUrl = page ? await db.getImageUrl(page.storage_path) : null;
      const lines = page ? await db.listDetectedLines(page.id) : [];

      const transcription = await db.getTranscription(submission.id);
      const steps = transcription ? await db.listSolutionSteps(transcription.id) : [];

      const breakdownPoints = feedback.breakdown_points as {
        step_index: number;
        what_happened: string;
        why_it_matters: string;
        misconception_key: string | null;
      }[];
      const highlightedLineIndices = new Set(
        steps
          .filter((s: any) => breakdownPoints.some((b) => b.step_index === s.step_index))
          .flatMap((s: any) => s.line_indices)
      );

      const tags = await db.listMisconceptionTags(submission.id);
      const module_ = await db.getModuleForQuestion(submission.question_id);
      const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
      const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));

      const practiceSet = await db.getPracticeSetForSubmission(submission.id);

      return {
        submissionId: submission.id,
        feedbackId: (feedback as any).id,
        total: grade.total_recommended,
        maxTotal: grade.max_total,
        criteria: criteria.map((c: any) => ({
          name: nameByKey[c.criterion_key] ?? c.criterion_key,
          score: c.score,
          maxScore: c.max_score,
        })),
        originalUrl,
        lines: lines.map((l: any) => ({ lineIndex: l.line_index, box: l.box })),
        highlightedLineIndices,
        summary: feedback.summary,
        strengths: feedback.strengths as { text: string; step_indices: number[] }[],
        breakdownPoints,
        nextAction: feedback.next_action,
        misconceptions: tags.map((t: any) => ({
          name: taxonomyById.get(t.misconception_id)?.name ?? "unnamed",
          severity: taxonomyById.get(t.misconception_id)?.severity ?? "conceptual",
          observedSignature: t.observed_signature,
          remediationNote: taxonomyById.get(t.misconception_id)?.remediation_note ?? "",
        })),
        hasPracticeSet: !!practiceSet,
      };
    })
  );

  const visible = cards.filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold">Your feedback</h1>

      {visible.length === 0 && <p className="text-sm text-neutral-500">No feedback yet.</p>}

      {visible.map((c) => (
        <div key={c.submissionId} className="flex flex-col gap-5 rounded border border-neutral-200 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold">
              {c.total}/{c.maxTotal}
            </span>
          </div>

          {/* Criterion bars */}
          <div className="flex flex-col gap-2">
            {c.criteria.map((cr, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-neutral-600">{cr.name}</span>
                <div className="h-2 flex-1 rounded-full bg-neutral-100">
                  <div
                    className="h-2 rounded-full bg-neutral-800"
                    style={{ width: `${(cr.score / cr.maxScore) * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-neutral-400">
                  {cr.score}/{cr.maxScore}
                </span>
              </div>
            ))}
          </div>

          {/* Annotated script — the emotional core (§11.2) */}
          {c.originalUrl && (
            <div>
              <h2 className="mb-1 text-xs font-semibold uppercase text-neutral-400">Your script</h2>
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.originalUrl} alt="your submission" className="block max-w-full" />
                {c.lines.map((l) => (
                  <div
                    key={l.lineIndex}
                    className={`absolute border-2 ${
                      c.highlightedLineIndices.has(l.lineIndex) ? "border-amber-500 bg-amber-400/20" : "border-transparent"
                    }`}
                    style={{
                      left: `${l.box.x * 100}%`,
                      top: `${l.box.y * 100}%`,
                      width: `${l.box.w * 100}%`,
                      height: `${l.box.h * 100}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-sm">{c.summary}</p>

          {c.strengths.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase text-neutral-400">What went well</h2>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {c.strengths.map((s, i) => (
                  <li key={i}>
                    {s.text} <span className="text-neutral-400">(step {s.step_indices.join(", ")})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.breakdownPoints.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase text-neutral-400">Where it broke down</h2>
              <ul className="mt-1 flex flex-col gap-2 text-sm">
                {c.breakdownPoints.map((b, i) => (
                  <li key={i} className="rounded bg-amber-50 px-3 py-2">
                    <p className="font-medium">Step {b.step_index}</p>
                    <p>{b.what_happened}</p>
                    <p className="text-neutral-600">{b.why_it_matters}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.misconceptions.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase text-neutral-400">Misconception cards</h2>
              <ul className="mt-1 flex flex-col gap-2 text-sm">
                {c.misconceptions.map((m, i) => (
                  <li key={i} className="rounded border border-neutral-200 px-3 py-2">
                    <p className="font-medium">
                      {m.name} <span className="text-xs text-neutral-400">({m.severity})</span>
                    </p>
                    <p className="text-neutral-600">{m.observedSignature}</p>
                    {m.remediationNote && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-neutral-400">Why this matters</summary>
                        <p className="mt-1 text-neutral-600">{m.remediationNote}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded bg-neutral-50 px-3 py-2 text-sm">
            <span className="font-medium">Next: </span>
            {c.nextAction}
          </div>

          {c.hasPracticeSet && (
            <Link href={`/practice/${c.submissionId}`} className="text-sm underline">
              Go to your practice set →
            </Link>
          )}

          <FeedbackFlagButton feedbackId={c.feedbackId} />
        </div>
      ))}
    </main>
  );
}
