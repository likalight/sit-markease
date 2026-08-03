import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { SubmitButton } from "@/components/submit-button";
import { DocumentUploadField } from "@/components/document-upload-field";
import { createQuestionAction } from "./actions";

export default async function NewQuestionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href="/assignments" className="text-body-sm text-muted underline">
          ← Back to assignments
        </Link>
        <h1 className="mt-xs text-title-lg text-body-strong">New assignment</h1>
        <p className="text-body-sm text-muted">
          Any subject with a checkable answer works — this isn't limited to math. Upload a real marking
          scheme, or paste your rubric notes as-is — the AI structures them into weighted, leveled
          grading criteria either way.
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-md py-sm text-body-sm text-disputed">
          {error}
        </p>
      )}

      <form action={createQuestionAction} className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs text-body-sm text-body">
          Assignment name
          <input
            name="assignmentName"
            required
            placeholder="e.g. Math Tutorial 1"
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <DocumentUploadField />

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Question
          <textarea
            name="promptText"
            required
            rows={2}
            placeholder="e.g. Prepare the adjusting journal entries for the following transactions..."
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
          Expected final answer <span className="text-muted-soft">(optional — enables symbolic verification for numeric/algebraic answers)</span>
          <input
            name="expectedAnswerLatex"
            placeholder="e.g. y = 2e^{x^2/2}, or leave blank for non-computational subjects"
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
            defaultValue={20}
            className="w-32 rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Topic tags <span className="text-muted-soft">(comma-separated, optional)</span>
          <input
            name="topicTags"
            placeholder="e.g. adjusting-entries, accrual-accounting"
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Rubric notes
          <textarea
            name="rubricNotes"
            required
            rows={6}
            placeholder="Paste your rubric as-is — a rough list is fine. e.g.:
- Correct account identification (30%)
- Correct debit/credit direction (30%)
- Correct amounts (25%)
- Clear presentation (15%)"
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <SubmitButton pendingLabel="Structuring rubric with AI…">Create assignment</SubmitButton>
      </form>
    </main>
  );
}
