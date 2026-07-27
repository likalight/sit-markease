import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { signOutAction } from "@/app/login/actions";

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data: profile } = await supabaseAdmin()
    .from("users")
    .select("name, role")
    .eq("email", user.email)
    .single();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {profile?.name ?? user.email}</h1>
        <p className="text-sm text-neutral-500">
          Signed in as <strong>{profile?.role ?? "unknown role"}</strong>
        </p>
      </div>

      {profile?.role === "educator" && (
        <Link href="/setup" className="text-sm underline">
          Go to assessment setup / upload →
        </Link>
      )}
      {profile?.role === "student" && (
        <p className="text-sm text-neutral-500">Student views land in a later milestone (M8).</p>
      )}

      <form action={signOutAction}>
        <button type="submit" className="text-sm text-neutral-400 underline">
          Sign out
        </button>
      </form>
    </main>
  );
}
