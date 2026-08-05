import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { PracticeItemCard } from "@/components/practice-item-card";
import { RequestRevisionButton } from "@/components/request-revision-button";

async function canStudentSeeResult(submission: any) {
  const finalGrade = await db.getFinalGrade(submission.id);
  if (!finalGrade) return false;
  const question = await db.getQuestionWithRubric(submission.question_id);
  const assessment = await db.getAssessment((question as any)?.assessment_id);
  return (assessment as any)?.assessment_mode === "formative" || (assessment as any)?.status === "released";
}

export default async function ExamPrepPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const allSubmissions = await db.listAllSubmissions();
  const mine = allSubmissions.filter((s: any) => s.student_id === user.id);
  const reviewedSubmissions = [];

  for (const submission of mine) {
    if (!(await canStudentSeeResult(submission))) continue;
    const question = await db.getQuestionWithRubric(submission.question_id);
    const assessment = question ? await db.getAssessment((question as any).assessment_id) : null;
    const practiceSet = await db.getPracticeSetForSubmission(submission.id);
    const misconceptionTags = await db.listMisconceptionTags(submission.id);
    reviewedSubmissions.push({ submission, question, assessment, practiceSet, hasMisconception: misconceptionTags.length > 0 });
  }

  // Practice generation only ever produces something for a submission with
  // an actual detected gap (docs/DECISIONS.md, s7-practice.ts) — pointing
  // the guided demo at whichever reviewed item happens to be first risks
  // landing on a fully-correct answer with nothing to target, which
  // correctly no-ops rather than generating anything. Prefer one that will
  // actually produce a result.
  const tourTargetIndex = reviewedSubmissions.findIndex((r) => r.hasMisconception && !r.practiceSet);

  const byMisconception = new Map<string, { name: string; severity: string; items: any[] }>();

  for (const { submission, practiceSet } of reviewedSubmissions) {
    const tags = await db.listMisconceptionTags(submission.id);
    if (tags.length === 0 || !practiceSet) continue;

    const module_ = await db.getModuleForQuestion(submission.question_id);
    const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
    const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));
    const items = await db.listPracticeItems((practiceSet as any).id);

    for (const tag of tags) {
      const meta = taxonomyById.get((tag as any).misconception_id) as any;
      const name = meta?.name ?? "unnamed";
      const entry = byMisconception.get(name) ?? { name, severity: meta?.severity ?? "conceptual", items: [] as any[] };
      entry.items.push(...items);
      byMisconception.set(name, entry);
    }
  }

  const groups = [...byMisconception.values()].filter((g) => g.items.length > 0);
  const allItemIds = groups.flatMap((g) => g.items.map((i: any) => i.id));
  const attempts = await db.listPracticeAttemptsForItems(allItemIds, user.id);
  const attemptByItemId = new Map(attempts.map((a: any) => [a.practice_item_id, a]));

  function masteryStatus(items: any[]): "mastered" | "in_progress" | "not_started" {
    const outcomes = items.map((i) => attemptByItemId.get(i.id)?.outcome ?? null);
    if (outcomes.every((o) => o === null)) return "not_started";
    if (outcomes.every((o) => o === "correct")) return "mastered";
    return "in_progress";
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-xl px-6 py-section">
      <div>
        <h1 className="font-serif text-display-lg text-ink">Exam prep</h1>
        <p className="text-body-md text-muted">
          Generate practice from reviewed work, then keep working through the gaps you have shown.
        </p>
      </div>

      <section className="flex flex-col gap-sm">
        <h2 className="text-title-md text-body-strong">Generate practice sets</h2>
        {reviewedSubmissions.length === 0 ? (
          <p className="text-body-md text-muted">Nothing ready yet. Reviewed formative work and released summative work will appear here.</p>
        ) : (
          <div className="divide-y divide-hairline border-y border-hairline">
            {reviewedSubmissions.map(({ submission, question, assessment, practiceSet }, index) => (
              <article key={submission.id} className="grid gap-md py-md md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-title-sm text-body-strong">
                    {(assessment as any)?.title ?? "Assessment"} {question ? `- Q${(question as any).position}` : ""}
                  </p>
                  <p className="line-clamp-2 text-body-sm text-muted">{(question as any)?.prompt_text ?? "Reviewed submission"}</p>
                </div>
                {practiceSet ? (
                  <Link href={`/practice/${submission.id}`} className="rounded-sm border border-hairline px-md py-xs text-center text-body-sm font-medium text-body">
                    Open practice
                  </Link>
                ) : (
                  <RequestRevisionButton
                    submissionId={submission.id}
                    label="Generate practice set"
                    dataTourId={index === tourTargetIndex ? "generate-practice-button" : undefined}
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="text-title-md text-body-strong">Practice by gap</h2>
        {groups.length === 0 ? (
          <p className="text-body-md text-muted">
            No generated practice yet. Use the section above to create a set from reviewed work.
          </p>
        ) : (
          groups.map((g) => {
            const status = masteryStatus(g.items);
            return (
              <div key={g.name} className="flex flex-col gap-md border-t border-hairline pt-lg">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="font-serif text-display-sm text-ink">{g.name}</h3>
                    <p className="text-caption-caps text-muted-soft">{g.severity}</p>
                  </div>
                  <span className={`text-caption-caps ${status === "mastered" ? "text-verified" : status === "in_progress" ? "text-attention" : "text-muted-soft"}`}>
                    {status === "mastered" ? "mastered" : status === "in_progress" ? "still working on it" : "not started"}
                  </span>
                </div>
                <div className="flex flex-col gap-lg">
                  {g.items.map((item: any, i: number) => {
                    const attempt = attemptByItemId.get(item.id);
                    return (
                      <PracticeItemCard
                        key={`${item.id}-${i}`}
                        itemId={item.id}
                        position={item.position}
                        difficulty={item.difficulty}
                        promptLatex={item.prompt_latex}
                        solutionLatex={item.solution_latex}
                        hintLadder={item.hint_ladder}
                        targetsBecause={item.targets_because}
                        provenance={item.provenance}
                        verifiedBy={item.verified_by}
                        initialAttempt={attempt ? { response: attempt.response, hintsUsed: attempt.hints_used, outcome: attempt.outcome } : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
