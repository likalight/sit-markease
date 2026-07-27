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
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="text-sm text-neutral-500">
          Signed in as <strong>{user.role}</strong>
        </p>
      </div>

      {user.role === "educator" && (
        <div className="flex flex-col gap-2">
          <Link href="/setup" className="text-sm underline">
            Upload a submission →
          </Link>
          <Link href="/review" className="text-sm underline">
            Review queue →
          </Link>
        </div>
      )}
      {user.role === "student" && (
        <Link href="/feedback" className="text-sm underline">
          My feedback →
        </Link>
      )}

      <form action={signOutAction}>
        <button type="submit" className="text-sm text-neutral-400 underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
