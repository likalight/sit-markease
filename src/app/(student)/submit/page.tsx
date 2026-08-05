import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { SubmitModeToggle } from "@/components/submit-mode-toggle";

// Student self-submit: photograph handwritten working, submit it directly
// against a question. Replaces the earlier educator-uploads-on-your-behalf
// flow — the educator's job is now reviewing the small uncertain queue, not
// intake.
export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const { q } = await searchParams;
  const questions = await db.listOpenFormativeQuestions();

  if (questions.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-xl">
        <p className="text-body-sm text-muted">
          No question set up yet — an educator needs to create one first.
        </p>
      </main>
    );
  }

  const question = (q && questions.find((x: any) => x.id === q)) ?? questions[questions.length - 1];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Submit your work</h1>
        {questions.length > 1 && (
          <div className="mt-sm flex flex-wrap gap-xs">
            {questions.map((opt: any, i: number) => {
              const baseTitle = (opt.assessment_title || `Question ${i + 1}`).replace(/\s*\([^)]*\)\s*$/, "");
              const sameTitleCount = questions.filter((o: any) => o.assessment_title === opt.assessment_title).length;
              const label = sameTitleCount > 1 ? `${baseTitle} — Q${opt.position}` : opt.assessment_title || baseTitle;
              return (
                <Link
                  key={opt.id}
                  href={`/submit?q=${opt.id}`}
                  className={`rounded-sm border px-sm py-xxs text-body-sm ${
                    opt.id === question.id
                      ? "border-primary bg-primary-soft font-medium text-primary-active"
                      : "border-hairline text-body"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
        <p className="mt-sm text-body-sm text-muted">{question.prompt_text}</p>
      </div>
      <SubmitModeToggle questionId={question.id} />
    </main>
  );
}
