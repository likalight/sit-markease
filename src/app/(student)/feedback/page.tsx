import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { FeedbackFlagButton } from "@/components/feedback-flag-button";
import { ScriptViewer } from "@/components/script-viewer";
import { stepState } from "@/lib/design/step-state";

// §11.1 S1 — student feedback view. Editorial density (docs/DESIGN.md §2):
// a student reads this once, carefully. Mark + criterion bars, the
// annotated script with the breakdown step(s) highlighted, feedback blocks,
// misconception cards with an expandable explainer, "was this helpful?"
// flag, and a link into the practice set (S2, /practice/[submissionId]).
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

      const tags = await db.listMisconceptionTags(submission.id);
      const misconceptionStepIndices = new Set<number>(tags.flatMap((t: any) => t.evidence_step_indices));
      const highlightedLineIndices = new Set(
        steps
          .filter((s: any) => breakdownPoints.some((b) => b.step_index === s.step_index))
          .flatMap((s: any) => s.line_indices)
      );

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
        scriptBoxes: lines.map((l: any) => {
          const step = steps.find((s: any) => s.line_indices.includes(l.line_index));
          return {
            lineIndex: l.line_index,
            box: l.box,
            state: step ? stepState(step.agreement, misconceptionStepIndices.has(step.step_index)) : ("neutral" as const),
          };
        }),
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
    <main className="mx-auto flex max-w-2xl flex-col gap-xxl px-6 py-section">
      <h1 className="font-serif text-display-lg text-ink">Your feedback</h1>

      {visible.length === 0 && <p className="text-body-md text-muted">No feedback yet.</p>}

      {visible.map((c) => (
        <div key={c.submissionId} className="flex flex-col gap-xl border-t border-hairline pt-xl">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-display-md tabular-nums text-ink">
              {c.total}/{c.maxTotal}
            </span>
          </div>

          {/* Criterion bars */}
          <div className="flex flex-col gap-xs">
            {c.criteria.map((cr, i) => (
              <div key={i} className="flex items-center gap-sm text-body-sm">
                <span className="w-40 shrink-0 text-muted">{cr.name}</span>
                <div className="h-2 flex-1 rounded-pill bg-surface-soft">
                  <div
                    className="h-2 rounded-pill bg-ink"
                    style={{ width: `${(cr.score / cr.maxScore) * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right tabular-nums text-muted">
                  {cr.score}/{cr.maxScore}
                </span>
              </div>
            ))}
          </div>

          {/* Annotated script — the emotional core (docs/DESIGN.md §3) */}
          {c.originalUrl && (
            <div>
              <h2 className="mb-xs text-caption-caps text-muted-soft">Your script</h2>
              <ScriptViewer imageUrl={c.originalUrl} boxes={c.scriptBoxes} activeLineIndices={c.highlightedLineIndices} />
            </div>
          )}

          <p className="text-body-md text-body">{c.summary}</p>

          {c.strengths.length > 0 && (
            <div>
              <h2 className="text-caption-caps text-muted-soft">What went well</h2>
              <ul className="mt-xs list-disc pl-5 text-body-md text-body">
                {c.strengths.map((s, i) => (
                  <li key={i}>
                    {s.text} <span className="text-muted-soft">(step {s.step_indices.join(", ")})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.breakdownPoints.length > 0 && (
            <div>
              <h2 className="text-caption-caps text-muted-soft">Where it broke down</h2>
              <ul className="mt-xs flex flex-col gap-sm">
                {c.breakdownPoints.map((b, i) => (
                  <li key={i} className="rounded-lg border-l-[3px] border-l-attention bg-attention-soft px-md py-sm">
                    <p className="text-title-sm text-body-strong">Step {b.step_index}</p>
                    <p className="text-body-md text-body">{b.what_happened}</p>
                    <p className="text-body-sm text-muted">{b.why_it_matters}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.misconceptions.length > 0 && (
            <div>
              <h2 className="text-caption-caps text-muted-soft">Misconception cards</h2>
              <ul className="mt-xs flex flex-col gap-sm">
                {c.misconceptions.map((m, i) => (
                  <li key={i} className="rounded-lg border-l-[3px] border-l-attention bg-surface-soft px-md py-sm">
                    <p className="text-title-md text-body-strong">
                      {m.name} <span className="text-caption-caps text-muted-soft">({m.severity})</span>
                    </p>
                    <p className="text-body-md text-muted">{m.observedSignature}</p>
                    {m.remediationNote && (
                      <details className="mt-xs">
                        <summary className="cursor-pointer text-caption text-muted-soft">Why this matters</summary>
                        <p className="mt-xs text-body-sm text-muted">{m.remediationNote}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-surface-soft px-md py-sm text-body-md text-body">
            <span className="font-medium text-body-strong">Next: </span>
            {c.nextAction}
          </div>

          {c.hasPracticeSet && (
            <Link href={`/practice/${c.submissionId}`} className="text-body-md text-body underline">
              Go to your practice set →
            </Link>
          )}

          <FeedbackFlagButton feedbackId={c.feedbackId} />
        </div>
      ))}
    </main>
  );
}
