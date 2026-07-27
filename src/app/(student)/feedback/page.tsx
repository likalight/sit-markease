import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

// Minimal student feedback view — satisfies M6's "renders in student view"
// acceptance criterion. Full S1 student screen (annotated script, practice
// set, "was this helpful" flag) is M8 scope; see docs/STUBS.md.
export default async function StudentFeedbackPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const allSubmissions = await db.listAllSubmissions();
  const mine = allSubmissions.filter((s: any) => s.student_id === user.id);

  const cards = await Promise.all(
    mine.map(async (submission: any) => {
      const grade = await db.getGradeRecommendation(submission.id);
      const feedback = await db.getFeedback(submission.id);
      const tags = await db.listMisconceptionTags(submission.id);
      if (!feedback || !grade) return null;

      const module_ = await db.getModuleForQuestion(submission.question_id);
      const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
      const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));

      return {
        submissionId: submission.id,
        total: grade.total_recommended,
        maxTotal: grade.max_total,
        summary: feedback.summary,
        strengths: feedback.strengths as { text: string; step_indices: number[] }[],
        breakdownPoints: feedback.breakdown_points as {
          step_index: number;
          what_happened: string;
          why_it_matters: string;
          misconception_key: string | null;
        }[],
        nextAction: feedback.next_action,
        misconceptions: tags.map((t: any) => ({
          name: taxonomyById.get(t.misconception_id)?.name ?? "unnamed",
          severity: taxonomyById.get(t.misconception_id)?.severity ?? "conceptual",
          observedSignature: t.observed_signature,
        })),
      };
    })
  );

  const visible = cards.filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold">Your feedback</h1>

      {visible.length === 0 && <p className="text-sm text-neutral-500">No feedback yet.</p>}

      {visible.map((c) => (
        <div key={c.submissionId} className="flex flex-col gap-4 rounded border border-neutral-200 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold">
              {c.total}/{c.maxTotal}
            </span>
          </div>
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
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded bg-neutral-50 px-3 py-2 text-sm">
            <span className="font-medium">Next: </span>
            {c.nextAction}
          </div>
        </div>
      ))}
    </main>
  );
}
