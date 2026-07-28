import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

// Assignments the educator has issued — a lightweight overview so the
// educator's job is "see what's happening across my questions," not
// "upload work on a student's behalf" (that moved to the student's own
// /submit page once submissions became self-serve).
export default async function AssignmentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const questions = await db.listAllQuestions();

  const rows = await Promise.all(
    questions.map(async (q: any) => {
      const module_ = await db.getModuleForQuestion(q.id);
      const submissions = await db.listSubmissionsForQuestion(q.id);
      let released = 0;
      let pending = 0;
      let totalScore = 0;
      let scoredCount = 0;
      for (const s of submissions) {
        const finalGrade = await db.getFinalGrade(s.id);
        if (finalGrade) {
          released += 1;
          totalScore += (finalGrade as any).total;
          scoredCount += 1;
        } else {
          const grade = await db.getGradeRecommendation(s.id);
          if (grade) pending += 1; // has a recommendation but not yet released — in the queue
        }
      }
      return {
        id: q.id,
        moduleCode: module_?.code ?? "—",
        moduleTitle: module_?.title ?? "Unknown module",
        promptText: q.prompt_text,
        maxScore: q.max_score,
        submissionCount: submissions.length,
        released,
        pending,
        avgScore: scoredCount ? totalScore / scoredCount : null,
      };
    })
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Assignments</h1>
        <p className="text-body-sm text-muted">Every question you've issued, and how it's going.</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-body-sm text-muted">No questions seeded yet — run <code>npm run seed</code>.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline border border-hairline">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-xs px-md py-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-caption-caps text-muted-soft">{r.moduleCode} — {r.moduleTitle}</span>
                {r.avgScore !== null && (
                  <span className="text-data-sm tabular-nums text-body-strong">
                    avg {r.avgScore.toFixed(1)}/{r.maxScore}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-body">{r.promptText}</p>
              <div className="flex items-center gap-md text-caption text-muted">
                <span>{r.submissionCount} submitted</span>
                <span className="text-verified">{r.released} auto/reviewed & released</span>
                {r.pending > 0 && (
                  <Link href="/review" className="text-disputed underline">
                    {r.pending} awaiting your review →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
