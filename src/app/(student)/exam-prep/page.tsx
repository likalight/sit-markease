import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { PracticeItemCard } from "@/components/practice-item-card";

// Exam prep / "revise everything you got wrong": pulls every misconception
// the student has shown across every graded submission, deduped, with every
// verified practice item generated for it — not just the most recent
// mistake's practice set.
export default async function ExamPrepPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const allSubmissions = await db.listAllSubmissions();
  const mine = allSubmissions.filter((s: any) => s.student_id === user.id);

  const byMisconception = new Map<string, { name: string; severity: string; items: any[] }>();

  for (const submission of mine) {
    const finalGrade = await db.getFinalGrade(submission.id);
    if (!finalGrade) continue; // only revise graded work

    const tags = await db.listMisconceptionTags(submission.id);
    if (tags.length === 0) continue;

    const module_ = await db.getModuleForQuestion(submission.question_id);
    const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
    const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));

    const practiceSet = await db.getPracticeSetForSubmission(submission.id);
    const items = practiceSet ? await db.listPracticeItems((practiceSet as any).id) : [];

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

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-xl px-6 py-section">
      <div>
        <h1 className="font-serif text-display-lg text-ink">Exam prep</h1>
        <p className="text-body-md text-muted">
          Every gap you've shown across your graded work, in one place — not just your last submission.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-body-md text-muted">
          Nothing to revise yet — once you have graded submissions with a detected misconception, they'll show
          up here.
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.name} className="flex flex-col gap-md border-t border-hairline pt-lg">
            <div>
              <h2 className="font-serif text-display-sm text-ink">{g.name}</h2>
              <p className="text-caption-caps text-muted-soft">{g.severity}</p>
            </div>
            <div className="flex flex-col gap-lg">
              {g.items.map((item: any, i: number) => {
                const attempt = attemptByItemId.get(item.id);
                return (
                  <PracticeItemCard
                    key={i}
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
        ))
      )}
    </main>
  );
}
