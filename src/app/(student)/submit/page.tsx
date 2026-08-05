import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { SubmitButton } from "@/components/submit-button";
import { startAssessmentAttemptAction } from "./actions";

function formatDate(value: string | null | undefined) {
  if (!value) return "No fixed date";
  return new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" }).format(new Date(value));
}

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");
  const { error } = await searchParams;
  const assigned = (await db.listAssignedAssessments(user.id)) as any[];
  const assessments = assigned.filter((assessment) => assessment.assessment_mode === "formative");

  const rows = await Promise.all(assessments.map(async (assessment) => ({
    assessment,
    questions: await db.listQuestionsForAssessment(assessment.id),
    attempts: await db.listAssessmentAttempts(assessment.id, user.id),
  })));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">My assessments</h1>
        <p className="text-body-sm text-muted">Only assessments issued to you appear here.</p>
      </div>
      {error && <p className="border border-disputed/30 bg-disputed-soft px-md py-sm text-body-sm text-disputed">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-body-sm text-muted">You have no formative assessments assigned right now.</p>
      ) : (
        <div className="divide-y divide-hairline border-y border-hairline">
          {rows.map(({ assessment, questions, attempts }) => {
            const active = (attempts as any[]).find((attempt) => attempt.status === "in_progress" && (!attempt.expires_at || new Date(attempt.expires_at) > new Date()));
            const remaining = Math.max(0, Number(assessment.attempts_allowed ?? 1) - attempts.length);
            const unavailable = assessment.status !== "open" || (assessment.opens_at && new Date(assessment.opens_at) > new Date()) || (assessment.due_at && new Date(assessment.due_at) <= new Date());
            return (
              <article key={assessment.id} className="grid gap-md py-md md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-xs">
                    <h2 className="text-title-md text-body-strong">{assessment.title}</h2>
                    <span className="border border-hairline px-xs py-[1px] text-caption text-muted">formative</span>
                  </div>
                  <p className="mt-xxs text-body-sm text-muted">
                    {questions.length} questions · {assessment.duration_minutes ? `${assessment.duration_minutes} minutes` : "untimed"} · due {formatDate(assessment.due_at)}
                  </p>
                  <p className="text-caption text-muted-soft">{remaining} of {assessment.attempts_allowed ?? 1} attempts remaining</p>
                </div>
                {active ? (
                  <a href={`/work/${assessment.id}?attempt=${active.id}`} className="rounded-sm bg-ink px-md py-xs text-center text-body-sm font-medium text-on-dark">Continue attempt</a>
                ) : (
                  <form action={startAssessmentAttemptAction}>
                    <input type="hidden" name="assessmentId" value={assessment.id} />
                    <SubmitButton disabled={unavailable || remaining === 0} pendingLabel="Starting…">Start attempt</SubmitButton>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
