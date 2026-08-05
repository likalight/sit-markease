import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { AttemptTimer } from "@/components/attempt-timer";
import { AssessmentScriptUpload } from "@/components/assessment-script-upload";
import { DemoGuidePanel } from "@/components/demo-guide-panel";

export default async function AssessmentWorkPage({ params, searchParams }: { params: Promise<{ assessmentId: string }>; searchParams: Promise<{ attempt?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");
  const { assessmentId } = await params;
  const { attempt: attemptId } = await searchParams;
  const assessment = await db.getAssessment(assessmentId);
  const attempt = attemptId ? await db.getAssessmentAttempt(attemptId) : null;
  if (!assessment || !attempt || (attempt as any).student_id !== user.id || (attempt as any).assessment_id !== assessmentId) notFound();
  const questions = await db.listQuestionsForAssessment(assessmentId);
  const submitted = (attempt as any).status !== "in_progress";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-lg px-6 py-xl">
      <div className="flex flex-wrap items-start justify-between gap-md border-b border-hairline pb-md">
        <div>
          <p className="text-caption-caps text-muted-soft">Formative · Attempt {(attempt as any).attempt_number}</p>
          <h1 className="text-title-lg text-body-strong">{(assessment as any).title}</h1>
        </div>
        <div className="border-l-2 border-primary pl-sm text-body-sm"><AttemptTimer expiresAt={(attempt as any).expires_at} /></div>
      </div>
      <section>
        <h2 className="text-title-md text-body-strong">Questions</h2>
        <ol className="mt-sm divide-y divide-hairline border-y border-hairline">
          {(questions as any[]).map((question) => (
            <li key={question.id} className="grid grid-cols-[3rem_1fr_auto] gap-sm py-sm text-body-sm">
              <strong>Q{question.position}</strong><span>{question.prompt_text}</span><span className="tabular-nums text-muted">{question.max_score} marks</span>
            </li>
          ))}
        </ol>
      </section>
      <DemoGuidePanel
        eyebrow="Formative loop"
        title="Submit once, then follow the feedback loop"
        body="For the prototype review, the built-in script stands in for the student's photographed work. The app still reads the image, maps it to the rubric-backed question, grades it, and unlocks review/practice from My assessments."
        steps={[
          { title: "Use built-in demo script", body: "No local files are needed for reviewers." },
          { title: "Wait for processing", body: "The app reads handwriting, grades against the rubric, and generates feedback." },
          { title: "Return to My assessments", body: "Review assessment appears once feedback is ready.", href: "/submit", action: "My assessments" },
        ]}
      />
      {submitted ? (
        <p className="border border-verified/30 bg-verified-soft px-md py-sm text-body-sm text-verified">This attempt has been submitted.</p>
      ) : (
        <section>
          <h2 className="text-title-md text-body-strong">Submit your complete response</h2>
          <AssessmentScriptUpload assessmentId={assessmentId} kind="formative" attemptId={(attempt as any).id} />
        </section>
      )}
    </main>
  );
}
