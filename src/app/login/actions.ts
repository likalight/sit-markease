"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/db/supabase-server";
import { env } from "@/lib/db/env";
import { setLocalSession, clearLocalSession } from "@/lib/auth/local-session";
import { localStore } from "@/lib/db/local-store";

export async function signInAction(formData: FormData) {
  if (env.isFixtureMode()) {
    // Fixture mode: role-switch, no password. See docs/DECISIONS.md M2 entry.
    const role = String(formData.get("role") ?? "educator") as "educator" | "student";
    const user = localStore.findOne("users", (u: any) => u.role === role);
    if (!user) {
      redirect(`/login?error=${encodeURIComponent(`no seeded ${role} — run npm run seed`)}`);
    }
    await setLocalSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
    redirect("/dashboard");
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  if (env.isFixtureMode()) {
    await clearLocalSession();
    redirect("/login");
  }

  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
