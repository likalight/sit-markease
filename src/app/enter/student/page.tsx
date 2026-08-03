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
        <Logo className="h-8 w-8" />
        <span className="font-serif text-title-md text-ink">SIT MarkEase</span>
      </Link>

      <div className="text-center">
        <p className="mb-xs text-caption-caps text-muted-soft">Student access</p>
        <h1 className="font-serif text-display-sm text-ink">Enter your student ID</h1>
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
        <input
          name="studentId"
          inputMode="numeric"
          maxLength={3}
          placeholder="111"
          autoFocus
          className="rounded-sm border border-hairline px-md py-sm text-center text-title-lg tracking-[0.4em] text-ink"
        />
        <SubmitButton pendingLabel="Checking…">Continue</SubmitButton>
      </form>

      <Link href="/" className="text-center text-body-sm text-muted underline">
        Back home
      </Link>
    </main>
  );
}
