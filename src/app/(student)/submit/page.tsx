import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { UploadAndViewer } from "@/components/upload-and-viewer";

// Student self-submit: photograph handwritten working, submit it directly
// against a question. Replaces the earlier educator-uploads-on-your-behalf
// flow — the educator's job is now reviewing the small uncertain queue, not
// intake.
export default async function SubmitPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const question = await db.getCurrentQuestion();

  if (!question) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-xl">
        <p className="text-body-sm text-muted">
          No question set up yet — an educator needs to create one first.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Submit your work</h1>
        <p className="text-body-sm text-muted">{question.prompt_text}</p>
      </div>
      <UploadAndViewer questionId={question.id} />
    </main>
  );
}
