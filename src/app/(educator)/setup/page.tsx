import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { UploadAndViewer } from "@/components/upload-and-viewer";

// M1 scope only: prove upload → deskew → line-detect → persist → overlay
// works end to end for the seeded demo question. The real E1 rubric-editor
// screen is a later milestone (see docs/STUBS.md).
export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const question = await db.getFirstQuestion();

  if (!question) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-xl">
        <p className="text-body-sm text-muted">
          No seeded question found — run <code>npm run seed</code> first.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Upload a submission</h1>
        <p className="text-body-sm text-muted">{question.prompt_text}</p>
      </div>
      <UploadAndViewer questionId={question.id} />
    </main>
  );
}
