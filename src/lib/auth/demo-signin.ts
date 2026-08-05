import { supabaseServer } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { db } from "@/lib/db/facade";
import { env } from "@/lib/db/env";
import { setLocalSession } from "@/lib/auth/local-session";
import { VALID_STUDENT_IDS, GATE_PASSWORD, emailForStudentId, resolveStudentAccount } from "@/lib/auth/student-roster";

// Sign-in-only logic (no redirect), shared by the real enter/actions.ts
// buttons and the demo-tour actions (src/lib/demo-tour/actions.ts) — the
// tour needs to switch persona mid-flow and redirect somewhere other than
// the fixed /submit or /review destinations those actions hardcode.

export async function ensureRealEducatorAccount(email: string, name: string) {
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

export async function signInAsStudent(id: string) {
  if (!VALID_STUDENT_IDS.includes(id)) {
    throw new Error("that student ID isn't recognised");
  }
  const email = emailForStudentId(id);
  const name = `Student ${id}`;

  if (env.isFixtureMode()) {
    let user = await db.findUserByEmail(email);
    if (!user) user = await db.createUser({ name, email, role: "student" });
    await setLocalSession({ userId: (user as any).id, email, name, role: "student" });
    return;
  }

  await resolveStudentAccount(id);
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password: GATE_PASSWORD });
  if (error) throw new Error("couldn't sign you in — try again");
}

export async function signInAsEducator() {
  const email = "educator@practica.sit.edu";
  const name = "Demo Educator";

  if (env.isFixtureMode()) {
    let user = await db.findUserByEmail(email);
    if (!user) user = await db.createUser({ name, email, role: "educator" });
    await setLocalSession({ userId: (user as any).id, email, name, role: "educator" });
    return;
  }

  await ensureRealEducatorAccount(email, name);
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password: GATE_PASSWORD });
  if (error) throw new Error("couldn't sign you in as the educator — try again");
}
