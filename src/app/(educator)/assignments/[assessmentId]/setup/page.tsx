import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { VALID_STUDENT_IDS, emailForStudentId } from "@/lib/auth/student-roster";
import { db } from "@/lib/db/facade";
import { SubmitButton } from "@/components/submit-button";
import { saveAssessmentSetupAction } from "./actions";

function singaporeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function AssessmentSetupPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");
  const { assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) notFound();
  const assigned = await db.listAssessmentStudents(assessmentId);
  const assignedEmails = new Set((assigned as any[]).map((row) => row.student?.email));
  const save = saveAssessmentSetupAction.bind(null, assessmentId);
  const formative = (assessment as any).assessment_mode === "formative";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href="/assignments" className="text-body-sm text-muted underline">← Back to assignments</Link>
        <h1 className="mt-xs text-title-lg text-body-strong">Issue assessment</h1>
        <p className="text-body-sm text-muted">
          Choose the private roster and availability. Times below use Singapore time.
        </p>
      </div>

      <form action={save} className="flex flex-col gap-lg">
        <section className="border-t border-hairline pt-md">
          <h2 className="text-title-md text-body-strong">Assessment</h2>
          <div className="mt-sm grid gap-md md:grid-cols-2">
            <label className="flex flex-col gap-xs text-body-sm md:col-span-2">
              Name
              <input name="title" required defaultValue={(assessment as any).title} className="rounded-sm border border-hairline px-md py-sm" />
            </label>
            <label className="flex flex-col gap-xs text-body-sm">
              Opens
              <input name="opensAt" type="datetime-local" defaultValue={singaporeLocal((assessment as any).opens_at)} className="rounded-sm border border-hairline px-md py-sm" />
            </label>
            <label className="flex flex-col gap-xs text-body-sm">
              Due
              <input name="dueAt" type="datetime-local" defaultValue={singaporeLocal((assessment as any).due_at)} className="rounded-sm border border-hairline px-md py-sm" />
            </label>
            {formative && (
              <>
                <label className="flex flex-col gap-xs text-body-sm">
                  Time limit (minutes)
                  <input name="durationMinutes" type="number" min={1} defaultValue={(assessment as any).duration_minutes ?? 45} className="rounded-sm border border-hairline px-md py-sm" />
                </label>
                <label className="flex flex-col gap-xs text-body-sm">
                  Attempts allowed
                  <input name="attemptsAllowed" type="number" min={1} defaultValue={(assessment as any).attempts_allowed ?? 1} className="rounded-sm border border-hairline px-md py-sm" />
                </label>
              </>
            )}
          </div>
        </section>

        <fieldset className="border-t border-hairline pt-md">
          <legend className="text-title-md text-body-strong">Assigned students</legend>
          <div className="mt-sm divide-y divide-hairline border-y border-hairline">
            {VALID_STUDENT_IDS.map((id) => (
              <label key={id} className="flex items-center justify-between py-sm text-body-sm">
                <span><strong>Student {id}</strong><span className="ml-sm text-muted-soft">{emailForStudentId(id)}</span></span>
                <input type="checkbox" name="studentIds" value={id} defaultChecked={assignedEmails.has(emailForStudentId(id))} className="h-4 w-4" />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center gap-sm">
          <SubmitButton pendingLabel="Saving…" dataTourId="save-issue-settings">Save issue settings</SubmitButton>
          <Link href={`/assignments/${assessmentId}/rubric`} className="text-body-sm underline">Review questions and rubrics →</Link>
        </div>
      </form>
    </main>
  );
}
