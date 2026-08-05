"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { db } from "@/lib/db/facade";
import { env } from "@/lib/db/env";
import { setLocalSession } from "@/lib/auth/local-session";
import { VALID_STUDENT_IDS, GATE_PASSWORD, emailForStudentId, resolveStudentAccount } from "@/lib/auth/student-roster";

async function ensureRealEducatorAccount(email: string, name: string) {
  const existing = await db.findUserByEmail(email);
  if (existing) return;

  const admin = supabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: GATE_PASSWORD,
    email_confirm: true,
  });
  if (error || !created?.user) return;
  await db.createUserWithId(created.user.id, { name, email, role: "educator" });
}

function safeRedirectPath(value: FormDataEntryValue | null, fallback: string) {
  const path = String(value ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return fallback;
  return path;
}

async function signInDemoStudent(studentId: string, redirectTo: string) {
  const id = studentId.trim();
  if (!VALID_STUDENT_IDS.includes(id)) {
    redirect(`/enter/student?error=${encodeURIComponent("that student ID isn't recognised")}`);
  }

  const email = emailForStudentId(id);
  const name = `Student ${id}`;

  if (env.isFixtureMode()) {
    let user = await db.findUserByEmail(email);
    if (!user) user = await db.createUser({ name, email, role: "student" });
    await setLocalSession({ userId: (user as any).id, email, name, role: "student" });
    redirect(redirectTo);
  }

  await resolveStudentAccount(id);
  const supabase = await supabaseServer();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: GATE_PASSWORD });
  if (signInError) {
    redirect(`/enter/student?error=${encodeURIComponent("couldn't sign you in - try again")}`);
  }
  redirect(redirectTo);
}

async function signInDemoEducator(redirectTo: string) {
  const email = "educator@practica.sit.edu";
  const name = "Demo Educator";

  if (env.isFixtureMode()) {
    let user = await db.findUserByEmail(email);
    if (!user) user = await db.createUser({ name, email, role: "educator" });
    await setLocalSession({ userId: (user as any).id, email, name, role: "educator" });
    redirect(redirectTo);
  }

  await ensureRealEducatorAccount(email, name);
  const supabase = await supabaseServer();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: GATE_PASSWORD });
  if (signInError) {
    redirect(`/login?error=${encodeURIComponent("couldn't sign you in as the educator - try again")}`);
  }
  redirect(redirectTo);
}

export async function enterAsStudentAction(formData: FormData) {
  await signInDemoStudent(String(formData.get("studentId") ?? ""), "/submit");
}

export async function enterAsEducatorAction() {
  await signInDemoEducator("/review");
}

export async function enterDemoAction(formData: FormData) {
  const role = String(formData.get("role") ?? "educator");
  const redirectTo = safeRedirectPath(formData.get("next"), "/demo");
  if (role === "student") {
    await signInDemoStudent(String(formData.get("studentId") ?? "111"), redirectTo);
  }
  await signInDemoEducator(redirectTo);
}
