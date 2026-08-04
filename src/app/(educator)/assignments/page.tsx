import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { SubmitButton } from "@/components/submit-button";
import { setAssessmentStatusAction } from "./actions";

export default async function AssignmentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const questions = await db.listAllQuestions();

  const rows = await Promise.all(
    questions.map(async (q: any) => {
      const assessment = await db.getAssessment(q.assessment_id);
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
        assessmentId: q.assessment_id,
        assignmentName: assessment?.title ?? "Untitled assignment",
        status: assessment?.status ?? "draft",
        mode: (assessment as any)?.assessment_mode ?? "summative",
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
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-title-lg text-body-strong">Assignments</h1>
          <p className="text-body-sm text-muted">Every assignment you've issued, and how it's going.</p>
        </div>
        <div className="flex items-center gap-sm">
          <Link href="/assignments/resources" className="rounded-sm border border-hairline px-md py-xs text-body-sm text-body">
            Reference material
          </Link>
          <Link href="/assignments/new" className="rounded-sm bg-primary px-md py-xs text-body-sm font-medium text-on-primary">
            + New assignment
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-body-sm text-muted">
          No assignments yet — <Link href="/assignments/new" className="underline">create one</Link>.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline border border-hairline">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-xs px-md py-sm">
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-xs text-caption-caps text-muted-soft">
                  {r.assignmentName}
                  <span className="rounded-sm border border-hairline px-xs py-[1px] text-caption text-muted-soft">
                    {r.mode}
                  </span>
                </span>
                {r.avgScore !== null && (
                  <span className="text-data-sm tabular-nums text-body-strong">
                    avg {r.avgScore.toFixed(1)}/{r.maxScore}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-body">{r.promptText}</p>
              <div className="flex items-center justify-between gap-md">
                <div className="flex items-center gap-md text-caption text-muted">
                  <span>{r.submissionCount} submitted</span>
                  {r.mode === "formative" ? (
                    <Link href={`/assignments/${r.assessmentId}/attempts`} className="underline">
                      {r.released} auto-released — view attempts →
                    </Link>
                  ) : (
                    <span className="text-verified">{r.released} reviewed &amp; released</span>
                  )}
                  {r.pending > 0 && (
                    <Link href="/review" className="text-disputed underline">
                      {r.pending} awaiting your review →
                    </Link>
                  )}
                </div>
                <form action={setAssessmentStatusAction}>
                  <input type="hidden" name="assessmentId" value={r.assessmentId} />
                  <input type="hidden" name="status" value={r.status === "open" ? "draft" : "open"} />
                  {r.status === "open" ? (
                    <SubmitButton
                      pendingLabel="Closing…"
                      className="rounded-sm border border-verified/40 bg-verified-soft px-sm py-xxs text-caption font-medium text-verified"
                    >
                      Open for submissions — close
                    </SubmitButton>
                  ) : (
                    <SubmitButton
                      pendingLabel="Opening…"
                      className="rounded-sm border border-hairline px-sm py-xxs text-caption font-medium text-body"
                    >
                      Draft — open for submissions
                    </SubmitButton>
                  )}
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
