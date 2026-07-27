import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { UploadAndViewer } from "@/components/upload-and-viewer";

// M1 scope only: prove upload → deskew → line-detect → persist → overlay
// works end to end for the seeded demo question. The real E1 rubric-editor
// screen is a later milestone.
export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const question = await db.getFirstQuestion();

  if (!question) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm text-neutral-500">
          No seeded question found — run <code>npm run seed</code> first.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Upload a submission</h1>
        <p className="text-sm text-neutral-500">{question.prompt_text}</p>
      </div>
      <UploadAndViewer questionId={question.id} />
    </main>
  );
}
