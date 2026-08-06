import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { SubmitButton } from "@/components/submit-button";
import { startAssessmentAttemptAction } from "./actions";
import { DEMO_FORMATIVE_ASSESSMENT_ID, DEMO_SUMMATIVE_ASSESSMENT_ID } from "@/lib/demo-tour/demo-content";

function formatDate(value: string | null | undefined) {
  if (!value) return "No fixed date";
  return new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" }).format(new Date(value));
}

async function visibleReviewCount(assessment: any, submissions: any[]) {
  let count = 0;
  for (const submission of submissions) {
    const finalGrade = await db.getFinalGrade(submission.id);
    if (finalGrade && (assessment.assessment_mode === "formative" || assessment.status === "released")) count++;
  }
  return count;
}

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");
  const { error } = await searchParams;
  const assessments = (await db.listAssignedAssessments(user.id)) as any[];
  const allSubmissions = ((await db.listAllSubmissions()) as any[]).filter((submission) => submission.student_id === user.id);

  const rows = await Promise.all(
    assessments.map(async (assessment) => {
      const questions = (await db.listQuestionsForAssessment(assessment.id)) as any[];
      const questionIds = new Set(questions.map((question) => question.id));
      const submissions = allSubmissions.filter((submission) => questionIds.has(submission.question_id));
      return {
        assessment,
        questions,
        submissions,
        attempts: await db.listAssessmentAttempts(assessment.id, user.id),
        reviewCount: await visibleReviewCount(assessment, submissions),
      };
    })
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">My assessments</h1>
        <p className="text-body-sm text-muted">Only assessments issued to you appear here.</p>
      </div>
      {error && <p className="border border-disputed/30 bg-disputed-soft px-md py-sm text-body-sm text-disputed">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-body-sm text-muted">You have no assessments assigned right now.</p>
      ) : (
        <div className="divide-y divide-hairline border-y border-hairline">
          {rows.map(({ assessment, questions, attempts, submissions, reviewCount }) => {
            const isFormative = assessment.assessment_mode === "formative";
            const active = (attempts as any[]).find((attempt) => attempt.status === "in_progress" && (!attempt.expires_at || new Date(attempt.expires_at) > new Date()));
            const remaining = Math.max(0, Number(assessment.attempts_allowed ?? 1) - attempts.length);
            const unavailable = assessment.status !== "open" || (assessment.opens_at && new Date(assessment.opens_at) > new Date()) || (assessment.due_at && new Date(assessment.due_at) <= new Date());
            const submitted = submissions.length > 0 || attempts.some((attempt: any) => attempt.status === "submitted");

            return (
              <article key={assessment.id} className="grid gap-md py-md md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <div className="flex items-center gap-xs">
                    <h2 className="text-title-md text-body-strong">{assessment.title}</h2>
                    <span className="border border-hairline px-xs py-[1px] text-caption text-muted">{assessment.assessment_mode}</span>
                  </div>
                  <p className="mt-xxs text-body-sm text-muted">
                    {questions.length} questions
                    {isFormative && <> · {assessment.duration_minutes ? `${assessment.duration_minutes} minutes` : "untimed"}</>}
                    {" · "}due {formatDate(assessment.due_at)}
                  </p>
                  {isFormative ? (
                    <p className="text-caption text-muted-soft">{remaining} of {assessment.attempts_allowed ?? 1} attempts remaining</p>
                  ) : (
                    <p className="text-caption text-muted-soft">
                      Your teacher uploads summative scripts. Results appear here after release.
                    </p>
                  )}
                  {submitted && reviewCount === 0 && (
                    <p className="mt-xs text-caption text-muted-soft">
                      Submitted work received. Review unlocks once marking is ready{isFormative ? "." : " and released."}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-xs md:min-w-44">
                  {isFormative && (
                    active ? (
                      <Link
                        href={`/work/${assessment.id}?attempt=${active.id}`}
                        data-tour-id={assessment.id === DEMO_FORMATIVE_ASSESSMENT_ID ? "submit-start-attempt" : undefined}
                        className="rounded-sm bg-ink px-md py-xs text-center text-body-sm font-medium text-on-dark"
                      >
                        Continue attempt
                      </Link>
                    ) : (
                      <form action={startAssessmentAttemptAction}>
                        <input type="hidden" name="assessmentId" value={assessment.id} />
                        <SubmitButton
                          disabled={unavailable || remaining === 0}
                          pendingLabel="Starting..."
                          dataTourId={assessment.id === DEMO_FORMATIVE_ASSESSMENT_ID ? "submit-start-attempt" : undefined}
                        >
                          Start attempt
                        </SubmitButton>
                      </form>
                    )
                  )}
                  {reviewCount > 0 && (
                    <Link
                      href={`/feedback?assessment=${assessment.id}`}
                      data-tour-id={
                        assessment.id === DEMO_FORMATIVE_ASSESSMENT_ID
                          ? "submit-review-assessment-formative"
                          : assessment.id === DEMO_SUMMATIVE_ASSESSMENT_ID
                            ? "submit-review-assessment-summative"
                            : undefined
                      }
                      className="rounded-sm border border-hairline px-md py-xs text-center text-body-sm font-medium text-body"
                    >
                      Review assessment
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
