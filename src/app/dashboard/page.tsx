import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { signOutAction } from "@/app/login/actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-serif text-display-sm text-ink">Welcome, {user.name}</h1>
        <p className="text-body-sm text-muted">
          Signed in as <strong className="text-body-strong">{user.role}</strong>
        </p>
      </div>

      {user.role === "educator" && (
        <div className="flex flex-col gap-2">
          <Link href="/review" className="text-body-sm text-body underline">
            Review queue (uncertain cases only) -&gt;
          </Link>
          <Link href="/assignments" className="text-body-sm text-body underline">
            Assignments you've issued -&gt;
          </Link>
        </div>
      )}
      {user.role === "student" && (
        <div className="flex flex-col gap-2">
          <Link href="/submit" className="text-body-sm text-body underline">
            Submit or review your work -&gt;
          </Link>
          <Link href="/exam-prep" className="text-body-sm text-body underline">
            Exam prep -&gt;
          </Link>
        </div>
      )}

      <form action={signOutAction}>
        <button type="submit" className="text-caption text-muted-soft underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
