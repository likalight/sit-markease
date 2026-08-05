import Link from "next/link";
import { DemoEntry } from "@/components/demo-entry";
import { Logo } from "@/components/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-lg px-6 py-section">
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-xs">
          <Logo className="h-10 w-10" />
          <span className="font-serif text-title-lg text-ink">SIT MarkEase</span>
        </Link>
        <h1 className="mt-md font-serif text-display-sm text-ink">Open the guided prototype</h1>
        <p className="mx-auto mt-xs max-w-lg text-body-sm text-muted">
          Reviewers can enter as the instructor or Student 111. The role switch remains available inside the app.
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-md py-sm text-center text-body-sm text-disputed">
          {error}
        </p>
      )}

      <DemoEntry />
    </main>
  );
}
