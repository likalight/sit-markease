import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

export default async function AttemptsPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");
  const { assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) notFound();
  const attempts = (await db.listAssessmentAttempts(assessmentId)) as any[];
  const scripts = (await db.listScriptUploadsForAssessment(assessmentId)) as any[];
  const questions = (await db.listQuestionsForAssessment(assessmentId)) as any[];
  const maxTotal = questions.reduce((sum, question) => sum + Number(question.max_score), 0);

  const rows = await Promise.all(attempts.map(async (attempt) => {
    const student = await db.getUser(attempt.student_id);
    const submissions = (await db.listAllSubmissions()).filter((submission: any) => submission.attempt_id === attempt.id);
    const grades = await Promise.all(submissions.map((submission: any) => db.getFinalGrade(submission.id)));
    const score = grades.reduce((sum, grade: any) => sum + Number(grade?.total ?? 0), 0);
    const script = scripts.find((item) => item.attempt_id === attempt.id);
    return { attempt, student, submissions, score, script };
  }));

  const pendingMappings = scripts.filter((script) => script.status === "needs_mapping_review");
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href="/assignments" className="text-body-sm text-muted underline">← Back to assignments</Link>
        <h1 className="mt-xs text-title-lg text-body-strong">{(assessment as any).title} — attempts</h1>
        <p className="text-body-sm text-muted">Assessment-level attempts, question mapping, and released formative results.</p>
      </div>
      {pendingMappings.length > 0 && (
        <section className="border-l-2 border-attention bg-attention-soft px-md py-sm">
          <h2 className="text-title-sm text-body-strong">Mapping review required</h2>
          <div className="mt-xs flex flex-wrap gap-sm">
            {await Promise.all(pendingMappings.map(async (script) => {
              const student = await db.getUser(script.student_id);
              return <Link key={script.id} href={`/scripts/${script.id}/mapping`} className="text-body-sm underline">{(student as any)?.name ?? "Student"} →</Link>;
            }))}
          </div>
        </section>
      )}
      {rows.length === 0 ? <p className="text-body-sm text-muted">No attempts yet.</p> : (
        <div className="overflow-x-auto border border-hairline">
          <table className="w-full border-collapse text-body-sm">
            <thead><tr className="border-b border-hairline bg-surface-soft text-left text-caption-caps text-muted-soft"><th className="px-md py-xs">Student</th><th className="px-md py-xs">Attempt</th><th className="px-md py-xs">Status</th><th className="px-md py-xs">Questions</th><th className="px-md py-xs text-right">Score</th></tr></thead>
            <tbody>{rows.map(({ attempt, student, submissions, score, script }) => <tr key={attempt.id} className="border-b border-hairline last:border-0"><td className="px-md py-sm font-medium">{(student as any)?.name ?? "Unknown"}</td><td className="px-md py-sm tabular-nums">{attempt.attempt_number}</td><td className="px-md py-sm">{script?.status ?? attempt.status}</td><td className="px-md py-sm tabular-nums">{submissions.length}/{questions.length}</td><td className="px-md py-sm text-right tabular-nums">{submissions.length ? `${score}/${maxTotal}` : "—"}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
