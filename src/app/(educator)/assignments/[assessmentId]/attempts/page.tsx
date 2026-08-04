import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

// Formative submissions auto-release (no instructor gate — see
// orchestrator.ts's autoReleaseIfFormative and docs/DECISIONS.md), so they
// never appear in /review. Nicholas's review: the instructor/TA still needs
// visibility into engagement and attempts, just after the fact rather than
// as a live approval queue.
export default async function AttemptsPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const { assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) notFound();

  const questions = (await db.listAllQuestions()).filter((q: any) => q.assessment_id === assessmentId);

  const attempts = (
    await Promise.all(
      questions.map(async (question: any) => {
        const submissions = await db.listSubmissionsForQuestion(question.id);
        return Promise.all(
          submissions.map(async (s: any) => {
            const student = s.student_id ? await db.getUser(s.student_id) : null;
            const finalGrade = await db.getFinalGrade(s.id);
            const feedback = await db.getFeedback(s.id);
            const flags = feedback ? await db.listFeedbackFlags((feedback as any).id) : [];
            return {
              submissionId: s.id,
              studentName: (student as any)?.name ?? "Unknown student",
              submittedAt: s.submitted_at,
              total: (finalGrade as any)?.total ?? null,
              maxScore: question.max_score,
              flags,
            };
          })
        );
      })
    )
  )
    .flat()
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  const seenSoFar = new Map<string, number>();
  const withAttemptNumber = attempts.map((a) => {
    const attemptNumber = (seenSoFar.get(a.studentName) ?? 0) + 1;
    seenSoFar.set(a.studentName, attemptNumber);
    return { ...a, attemptNumber };
  });
  withAttemptNumber.reverse(); // newest first for display

  const studentCount = new Set(attempts.map((a) => a.studentName)).size;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href="/assignments" className="text-body-sm text-muted underline">
          ← Back to assignments
        </Link>
        <h1 className="mt-xs text-title-lg text-body-strong">{(assessment as any).title} — attempts</h1>
        <p className="text-body-sm text-muted">
          Formative practice auto-releases with no approval step — this is the engagement record for that,
          not a queue to act on.
        </p>
      </div>

      <div className="flex flex-wrap gap-sm text-body-sm text-muted">
        <span>{attempts.length} total attempt(s)</span>
        <span>{studentCount} student(s)</span>
      </div>

      {withAttemptNumber.length === 0 ? (
        <p className="text-body-sm text-muted">No attempts yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
          {withAttemptNumber.map((a) => (
            <li key={a.submissionId} className="flex flex-col gap-xxs px-md py-sm">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium text-body-strong">
                  {a.studentName} <span className="text-caption text-muted-soft">(attempt {a.attemptNumber})</span>
                </span>
                <span className="text-data-sm tabular-nums text-body">
                  {a.total !== null ? `${a.total}/${a.maxScore}` : "pending"}
                </span>
              </div>
              <div className="flex items-center justify-between text-caption text-muted-soft">
                <span>{new Date(a.submittedAt).toLocaleString()}</span>
                {a.flags.length > 0 && (
                  <span className="text-attention">
                    ⚑ {a.flags.length} misread flag{a.flags.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
