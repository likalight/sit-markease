"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/db/supabase-server";
import { env } from "@/lib/db/env";
import { setLocalSession, clearLocalSession } from "@/lib/auth/local-session";
import { localStore } from "@/lib/db/local-store";
import { db } from "@/lib/db/facade";

// Fixture-mode quick entry for the educator role (§10 M2) — students sign
// up/in for real below; the educator role is intentionally lighter-touch
// than a full account system since it only ever reviews the small uncertain
// queue, not every submission.
export async function signInAsEducatorAction() {
  if (!env.isFixtureMode()) redirect("/login");
  const user = localStore.findOne("users", (u: any) => u.role === "educator");
  if (!user) {
    redirect(`/login?error=${encodeURIComponent("no seeded educator — run npm run seed")}`);
  }
  await setLocalSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
  redirect("/dashboard");
}

// Fixture-mode student sign-in by email — no password, matching the rest of
// this build's local-auth stand-in (docs/DECISIONS.md "M2 — free-tier
// providers"). Real mode falls through to Supabase Auth.
export async function signInAction(formData: FormData) {
  if (env.isFixtureMode()) {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const user = await db.findUserByEmail(email);
    if (!user) {
      redirect(`/login?error=${encodeURIComponent("no account with that email — sign up below")}`);
    }
    await setLocalSession({ userId: (user as any).id, email: (user as any).email, name: (user as any).name, role: (user as any).role });
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

// Real student self-signup — students submit their own work now, so they
// need their own account rather than an educator uploading on their behalf.
export async function signUpAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name || !email) {
    redirect(`/login?error=${encodeURIComponent("name and email are required")}`);
  }

  if (env.isFixtureMode()) {
    const existing = await db.findUserByEmail(email);
    if (existing) {
      redirect(`/login?error=${encodeURIComponent("an account with that email already exists — sign in instead")}`);
    }
    const user = await db.createUser({ name, email, role: "student" });
    await setLocalSession({ userId: (user as any).id, email, name, role: "student" });
    redirect("/dashboard");
  }

  // Real mode: create the Supabase Auth account, then the matching row in
  // our own `users` table (role/name aren't things Supabase Auth itself
  // stores) — same two-step pattern as scripts/seed.ts's demo accounts.
  const password = String(formData.get("password") ?? "");
  if (!password || password.length < 8) {
    redirect(`/login?error=${encodeURIComponent("password must be at least 8 characters")}`);
  }

  const existing = await db.findUserByEmail(email);
  if (existing) {
    redirect(`/login?error=${encodeURIComponent("an account with that email already exists — sign in instead")}`);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "signup failed")}`);
  }

  await db.createUserWithId(data.user!.id, { name, email, role: "student" });
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
