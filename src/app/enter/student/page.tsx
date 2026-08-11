import Link from "next/link";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { enterAsStudentAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EnterStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-lg px-6 py-section">
      <Link href="/" className="mx-auto flex items-center gap-xs">
        <Logo className="h-8 w-auto" />
      </Link>

      <div className="text-center">
        <p className="mb-xs text-caption-caps text-muted-soft">Student access</p>
        <h1 className="font-serif text-display-sm text-ink">Continue as a student</h1>
        <p className="mt-xs text-body-sm text-muted">
          Straight into your submissions — photograph or upload your work from there.
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-primary bg-primary-soft px-md py-sm text-center text-body-sm text-body-strong">
          {error}
        </p>
      )}

      <form action={enterAsStudentAction} className="flex flex-col gap-sm">
        <input type="hidden" name="studentId" value="111" />
        <SubmitButton pendingLabel="Signing in…">Continue as the demo student →</SubmitButton>
      </form>

      <Link href="/" className="text-center text-body-sm text-muted underline">
        Back home
      </Link>
    </main>
  );
}
