"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { db } from "@/lib/db/facade";
import { env } from "@/lib/db/env";
import { setLocalSession } from "@/lib/auth/local-session";
import { VALID_STUDENT_IDS, GATE_PASSWORD, emailForStudentId, resolveStudentAccount } from "@/lib/auth/student-roster";

// Lightweight access gate: three fixed student IDs stand in for full signup
// so a student can go straight from the landing page into the submit
// portal, and a single click takes an educator straight into the review
// queue. These are still real Supabase Auth accounts underneath (created on
// first use) so every downstream page — which reads getCurrentUser() off a
// real session — works unmodified; the "gate" is the 3-digit ID check, not
// the password, which is fixed and never shown to the user.
// VALID_STUDENT_IDS / emailForStudentId / account provisioning now live in
// src/lib/auth/student-roster.ts, shared with the educator on-behalf-of
// upload route (see docs/DECISIONS.md).

async function ensureRealEducatorAccount(email: string, name: string) {
  const existing = await db.findUserByEmail(email);
  if (existing) return;

  const admin = supabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: GATE_PASSWORD,
    email_confirm: true,
  });
  if (error || !created?.user) {
    // Someone else raced this into existence between the findUserByEmail
    // check and here — fine, the row will already be there.
    return;
  }
  await db.createUserWithId(created.user.id, { name, email, role: "educator" });
}

export async function enterAsStudentAction(formData: FormData) {
  const id = String(formData.get("studentId") ?? "").trim();
  if (!VALID_STUDENT_IDS.includes(id)) {
    redirect(`/enter/student?error=${encodeURIComponent("that student ID isn't recognised")}`);
  }

  const email = emailForStudentId(id);
  const name = `Student ${id}`;

  if (env.isFixtureMode()) {
    let user = await db.findUserByEmail(email);
    if (!user) user = await db.createUser({ name, email, role: "student" });
    await setLocalSession({ userId: (user as any).id, email, name, role: "student" });
    redirect("/submit");
  }

  await resolveStudentAccount(id);
  const supabase = await supabaseServer();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: GATE_PASSWORD });
  if (signInError) {
    redirect(`/enter/student?error=${encodeURIComponent("couldn't sign you in — try again")}`);
  }
  redirect("/submit");
}

export async function enterAsEducatorAction() {
  const email = "educator@practica.sit.edu";
  const name = "Demo Educator";

  if (env.isFixtureMode()) {
    let user = await db.findUserByEmail(email);
    if (!user) user = await db.createUser({ name, email, role: "educator" });
    await setLocalSession({ userId: (user as any).id, email, name, role: "educator" });
    redirect("/review");
  }

  await ensureRealEducatorAccount(email, name);
  const supabase = await supabaseServer();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: GATE_PASSWORD });
  if (signInError) {
    redirect(`/login?error=${encodeURIComponent("couldn't sign you in as the educator — try again")}`);
  }
  redirect("/review");
}
