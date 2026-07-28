import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

// Class insights: which problems the cohort is actually getting wrong, and
// which students need help — the view that turns "AI marks it" into
// something an educator can act on beyond one script at a time.
export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const submissions = await db.listAllSubmissions();

  const misconceptionCounts = new Map<string, { name: string; count: number }>();
  const studentStats = new Map<string, { name: string; submitted: number; released: number; totalScore: number; maxTotal: number; misconceptions: number }>();

  for (const s of submissions) {
    const tags = await db.listMisconceptionTags(s.id);
    const module_ = await db.getModuleForQuestion(s.question_id);
    const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
    const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));

    for (const t of tags) {
      const name = taxonomyById.get((t as any).misconception_id)?.name ?? "unnamed";
      const entry = misconceptionCounts.get(name) ?? { name, count: 0 };
      entry.count += 1;
      misconceptionCounts.set(name, entry);
    }

    if (s.student_id) {
      const student = await db.getUser(s.student_id);
      const key = s.student_id;
      const entry = studentStats.get(key) ?? {
        name: student?.name ?? "Unknown student",
        submitted: 0,
        released: 0,
        totalScore: 0,
        maxTotal: 0,
        misconceptions: 0,
      };
      entry.submitted += 1;
      entry.misconceptions += tags.length;
      const finalGrade = await db.getFinalGrade(s.id);
      if (finalGrade) {
        entry.released += 1;
        entry.totalScore += (finalGrade as any).total;
        const grade = await db.getGradeRecommendation(s.id);
        entry.maxTotal += grade?.max_total ?? 0;
      }
      studentStats.set(key, entry);
    }
  }

  const topMisconceptions = [...misconceptionCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  const students = [...studentStats.values()].sort((a, b) => b.misconceptions - a.misconceptions);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-xl px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Class insights</h1>
        <p className="text-body-sm text-muted">What the cohort is getting wrong, and who needs help.</p>
      </div>

      <div>
        <h2 className="mb-sm text-caption-caps text-muted-soft">Most common misconceptions</h2>
        {topMisconceptions.length === 0 ? (
          <p className="text-body-sm text-muted">No misconceptions detected yet.</p>
        ) : (
          <ul className="flex flex-col gap-xs">
            {topMisconceptions.map((m) => (
              <li key={m.name} className="flex items-center gap-sm">
                <span className="w-48 shrink-0 truncate text-body-sm text-body">{m.name}</span>
                <div className="h-2 flex-1 border border-hairline">
                  <div
                    className="h-full bg-attention"
                    style={{ width: `${(m.count / topMisconceptions[0].count) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-caption tabular-nums text-muted">{m.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-sm text-caption-caps text-muted-soft">Students, most misconceptions first</h2>
        {students.length === 0 ? (
          <p className="text-body-sm text-muted">No submissions yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline border border-hairline">
            {students.map((st, i) => (
              <li key={i} className="flex items-center justify-between px-md py-xs">
                <span className="text-body-sm text-body">{st.name}</span>
                <span className="text-caption text-muted">
                  {st.submitted} submitted · {st.released} released
                  {st.maxTotal > 0 && ` · avg ${(st.totalScore / Math.max(st.released, 1)).toFixed(1)}/${(st.maxTotal / Math.max(st.released, 1)).toFixed(0)}`}
                  {" · "}
                  <span className={st.misconceptions > 0 ? "text-attention" : "text-verified"}>
                    {st.misconceptions} misconception{st.misconceptions === 1 ? "" : "s"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
