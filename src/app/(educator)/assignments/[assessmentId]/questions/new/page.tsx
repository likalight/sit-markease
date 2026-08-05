import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { SubmitButton } from "@/components/submit-button";
import { DocumentUploadField } from "@/components/document-upload-field";
import { addQuestionAction } from "./actions";

export default async function AddQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const { assessmentId } = await params;
  const { error } = await searchParams;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) redirect("/assignments");

  const boundAction = addQuestionAction.bind(null, assessmentId);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href={`/assignments/${assessmentId}/rubric`} className="text-body-sm text-muted underline">
          ← Back to {(assessment as any).title}
        </Link>
        <h1 className="mt-xs text-title-lg text-body-strong">Add another question</h1>
        <p className="text-body-sm text-muted">
          Same content as any other question — this one is added to the existing assignment instead of
          starting a new one.
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-md py-sm text-body-sm text-disputed">
          {error}
        </p>
      )}

      <form action={boundAction} className="flex flex-col gap-md">
        <DocumentUploadField />

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Question
          <textarea
            name="promptText"
            required
            rows={2}
            placeholder="e.g. Find the exact roots of the equation..."
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Model solution
          <textarea
            name="modelSolution"
            required
            rows={4}
            placeholder="Write out a correct, worked solution — this is what the AI grades against."
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Expected final answer <span className="text-muted-soft">(optional — enables symbolic verification)</span>
          <input
            name="expectedAnswerLatex"
            placeholder="e.g. x = 1/2 or x = 3"
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Total points
          <input
            name="maxScore"
            type="number"
            required
            min={1}
            defaultValue={10}
            className="w-32 rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Topic tags <span className="text-muted-soft">(comma-separated, optional)</span>
          <input
            name="topicTags"
            placeholder="e.g. differential-equations, integration"
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Rubric notes
          <textarea
            name="rubricNotes"
            required
            rows={6}
            placeholder="Paste your rubric/mark scheme notes as-is — a rough list is fine."
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <SubmitButton pendingLabel="Structuring rubric with AI…">Add question</SubmitButton>
      </form>
    </main>
  );
}
