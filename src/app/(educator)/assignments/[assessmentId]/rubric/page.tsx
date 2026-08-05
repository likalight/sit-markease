import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { RubricEditor } from "@/components/rubric-editor";
import { AssessmentRubricPdfImport } from "@/components/assessment-rubric-pdf-import";
import { SubmitButton } from "@/components/submit-button";
import { setAssessmentStatusAction } from "../../actions";
import { DemoGuidePanel } from "@/components/demo-guide-panel";

export default async function AssessmentRubricPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const { assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) redirect("/assignments");

  const questions = await db.listQuestionsForAssessment(assessmentId);
  const withRubrics = await Promise.all(
    (questions as any[]).map(async (q) => {
      const full = await db.getQuestionWithRubric(q.id);
      return { question: q, rubric: full?.rubric, criteria: full?.criteria ?? [] };
    })
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href="/assignments" className="text-body-sm text-muted underline">
          ← Back to assignments
        </Link>
        <div className="mt-xs flex items-baseline justify-between">
          <div>
            <h1 className="text-title-lg text-body-strong">{(assessment as any).title}</h1>
            <p className="text-body-sm text-muted">
              {(assessment as any).assessment_mode} · {withRubrics.length} question
              {withRubrics.length === 1 ? "" : "s"} ·{" "}
              {(assessment as any).status === "open" ? "open for submissions" : "draft"}
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <Link
              href={`/assignments/${assessmentId}/setup`}
              className="rounded-sm border border-hairline px-md py-xs text-body-sm text-body"
            >
              Issue settings
            </Link>
            <Link
              href={`/assignments/${assessmentId}/questions/new`}
              className="rounded-sm border border-hairline px-md py-xs text-body-sm text-body"
            >
              + Add another question
            </Link>
            <form action={setAssessmentStatusAction}>
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input
                type="hidden"
                name="status"
                value={(assessment as any).status === "open" ? "draft" : "open"}
              />
              {(assessment as any).status === "open" ? (
                <SubmitButton
                  pendingLabel="Closing…"
                  className="rounded-sm border border-verified/40 bg-verified-soft px-md py-xs text-body-sm font-medium text-verified"
                >
                  Close for submissions
                </SubmitButton>
              ) : (
                <SubmitButton
                  pendingLabel="Opening…"
                  className="rounded-sm bg-primary px-md py-xs text-body-sm font-medium text-on-primary"
                >
                  Open for submissions
                </SubmitButton>
              )}
            </form>
          </div>
        </div>
      </div>

      <DemoGuidePanel
        eyebrow="Rubric source"
        title="The mark scheme becomes the grading contract"
        body="For the demo, reviewers do not need to upload their own PDF. The visible criteria below are what the OCR/vision pipeline grades against, and the instructor can amend them before opening the assessment."
        steps={[
          { title: "Upload PDF when needed", body: "The importer parses a mark scheme into question-by-question rubric rows." },
          { title: "Amend criteria", body: "The teacher can edit names, marks, and level descriptions before issuing work." },
          { title: "Open or issue", body: "Only rubric-backed questions appear in student or instructor upload flows.", href: `/assignments/${assessmentId}/setup`, action: "Issue settings" },
        ]}
      />

      <AssessmentRubricPdfImport assessmentId={assessmentId} />

      <div className="demo-highlight flex flex-col gap-md">
        {withRubrics.map(({ question, rubric, criteria }) => (
          <RubricEditor
            key={question.id}
            assessmentId={assessmentId}
            rubricId={(rubric as any)?.id}
            questionId={question.id}
            questionPromptText={question.prompt_text}
            initialCriteria={(criteria as any[]).map((c) => ({
              key: c.key,
              name: c.name,
              weight: c.weight,
              max_score: c.max_score,
              levels: c.levels ?? [],
            }))}
          />
        ))}
      </div>
    </main>
  );
}
