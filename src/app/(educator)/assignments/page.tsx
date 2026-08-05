import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { SubmitButton } from "@/components/submit-button";
import { releaseAssessmentAction, setAssessmentStatusAction } from "./actions";
import { DEMO_FORMATIVE_ASSESSMENT_ID, DEMO_SUMMATIVE_ASSESSMENT_ID } from "@/lib/demo-tour/demo-content";

export default async function AssignmentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const questions = await db.listAllQuestions();

  // One row per ASSESSMENT, not per question — a 7-question assessment used
  // to render as 7 identical-titled cards. Group first, then aggregate each
  // group's submission/score stats across all of its questions.
  const byAssessment = new Map<string, any[]>();
  for (const q of questions as any[]) {
    const group = byAssessment.get(q.assessment_id) ?? [];
    group.push(q);
    byAssessment.set(q.assessment_id, group);
  }

  const rows = await Promise.all(
    Array.from(byAssessment.entries()).map(async ([assessmentId, groupQuestions]) => {
      const assessment = await db.getAssessment(assessmentId);
      if ((assessment as any)?.archived_at) return null;
      let submissionCount = 0;
      let released = 0;
      let pending = 0;
      let totalScore = 0;
      let totalMax = 0;
      let scoredCount = 0;

      for (const q of groupQuestions) {
        const submissions = await db.listSubmissionsForQuestion(q.id);
        submissionCount += submissions.length;
        for (const s of submissions) {
          const finalGrade = await db.getFinalGrade(s.id);
          if (finalGrade) {
            released += 1;
            totalScore += (finalGrade as any).total;
            totalMax += q.max_score;
            scoredCount += 1;
          } else {
            const grade = await db.getGradeRecommendation(s.id);
            if (grade) pending += 1;
          }
        }
      }

      return {
        assessmentId,
        assignmentName: assessment?.title ?? "Untitled assignment",
        status: (assessment as any)?.status ?? "draft",
        mode: (assessment as any)?.assessment_mode ?? "summative",
        questionCount: groupQuestions.length,
        submissionCount,
        released,
        pending,
        avgPct: scoredCount && totalMax ? totalScore / totalMax : null,
      };
    })
  );

  const visibleRows = rows.filter(Boolean) as NonNullable<(typeof rows)[number]>[];
  visibleRows.sort((a, b) => a.assignmentName.localeCompare(b.assignmentName));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-lg px-6 py-xl">
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

      {visibleRows.length === 0 ? (
        <p className="text-body-sm text-muted">
          No assignments yet — <Link href="/assignments/new" className="underline">create one</Link>.
        </p>
      ) : (
        <div className="overflow-x-auto border border-hairline">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-soft text-left text-caption-caps text-muted-soft">
                <th className="px-md py-xs font-medium">Name</th>
                <th className="px-md py-xs font-medium">Mode</th>
                <th className="px-md py-xs font-medium">Questions</th>
                <th className="px-md py-xs text-right font-medium">Submitted</th>
                <th className="px-md py-xs text-right font-medium">Avg score</th>
                <th className="px-md py-xs font-medium">Status</th>
                <th className="px-md py-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.assessmentId} className="border-b border-hairline last:border-b-0 hover:bg-surface-soft/60">
                  <td className="px-md py-sm text-body text-body-strong">{r.assignmentName}</td>
                  <td className="px-md py-sm">
                    <span className="rounded-sm border border-hairline px-xs py-[1px] text-caption text-muted-soft">
                      {r.mode}
                    </span>
                  </td>
                  <td className="px-md py-sm tabular-nums text-muted">{r.questionCount}</td>
                  <td className="px-md py-sm text-right tabular-nums text-muted">{r.submissionCount}</td>
                  <td className="px-md py-sm text-right tabular-nums text-body-strong">
                    {r.avgPct !== null ? `${Math.round(r.avgPct * 100)}%` : "—"}
                  </td>
                  <td className="px-md py-sm">
                    {r.status === "released" ? (
                      <span className="border border-verified/40 bg-verified-soft px-sm py-xxs text-caption font-medium text-verified">Released</span>
                    ) : <form action={setAssessmentStatusAction}>
                      <input type="hidden" name="assessmentId" value={r.assessmentId} />
                      <input type="hidden" name="status" value={r.status === "open" ? "draft" : "open"} />
                      {r.status === "open" ? (
                        <SubmitButton
                          pendingLabel="Closing…"
                          className="rounded-sm border border-verified/40 bg-verified-soft px-sm py-xxs text-caption font-medium text-verified"
                        >
                          Open — close
                        </SubmitButton>
                      ) : (
                        <SubmitButton
                          pendingLabel="Opening…"
                          className="rounded-sm border border-hairline px-sm py-xxs text-caption font-medium text-body"
                        >
                          Draft — open
                        </SubmitButton>
                      )}
                    </form>}
                  </td>
                  <td className="px-md py-sm">
                    <div className="flex flex-col gap-xxs text-caption">
                      <Link href={`/assignments/${r.assessmentId}/setup`} className="underline">
                        Issue to students →
                      </Link>
                      <Link
                        href={`/assignments/${r.assessmentId}/rubric`}
                        data-tour-id={
                          r.assessmentId === DEMO_FORMATIVE_ASSESSMENT_ID
                            ? "review-rubric-formative"
                            : r.assessmentId === DEMO_SUMMATIVE_ASSESSMENT_ID
                              ? "review-rubric-summative"
                              : undefined
                        }
                        className="underline"
                      >
                        Review rubric →
                      </Link>
                      {r.mode === "formative" ? (
                        <Link href={`/assignments/${r.assessmentId}/attempts`} className="underline">
                          {r.released} auto-released — view attempts →
                        </Link>
                      ) : (
                        <>
                          <span className="text-verified">{r.released} reviewed &amp; released</span>
                          <Link
                            href={`/assignments/${r.assessmentId}/upload`}
                            data-tour-id={r.assessmentId === DEMO_SUMMATIVE_ASSESSMENT_ID ? "assignments-upload-combinatorics" : undefined}
                            className="underline"
                          >
                            Upload a script →
                          </Link>
                          {r.submissionCount > 0 && r.pending === 0 && r.status !== "released" && (
                            <form
                              action={releaseAssessmentAction}
                              data-tour-id={r.assessmentId === DEMO_SUMMATIVE_ASSESSMENT_ID ? "release-all-results" : undefined}
                            >
                              <input type="hidden" name="assessmentId" value={r.assessmentId} />
                              <SubmitButton pendingLabel="Releasing…" className="text-left text-primary-active underline">
                                Release all results →
                              </SubmitButton>
                            </form>
                          )}
                        </>
                      )}
                      {r.pending > 0 && (
                        <Link href="/review" className="text-disputed underline">
                          {r.pending} awaiting your review →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
