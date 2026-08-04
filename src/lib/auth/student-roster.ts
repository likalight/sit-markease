import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { db } from "@/lib/db/facade";
import { env } from "@/lib/db/env";

// Single source of truth for the 3-fixed-ID demo roster — shared by the
// student login gate (src/app/enter/actions.ts) and the educator
// on-behalf-of upload route, which needs a student's real uuid to attribute
// a submission without ever establishing a session as that student.
export const VALID_STUDENT_IDS = ["111", "222", "333"];
export const GATE_PASSWORD = "practica-gate-access-2026";

export function emailForStudentId(id: string) {
  return `student${id}@practica.sit.edu`;
}

// Provisions (if needed) and returns the real `users` row for a 3-digit
// student ID. Same lazy-provisioning pattern as the login gate, factored out
// so there's one place that knows the valid IDs and the account shape.
export async function resolveStudentAccount(id: string) {
  if (!VALID_STUDENT_IDS.includes(id)) return null;

  const email = emailForStudentId(id);
  const name = `Student ${id}`;

  const existing = await db.findUserByEmail(email);
  if (existing) return existing;

  if (env.isFixtureMode()) {
    return db.createUser({ name, email, role: "student" });
  }

  const admin = supabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: GATE_PASSWORD,
    email_confirm: true,
  });
  if (error || !created?.user) {
    // Someone else raced this into existence between the findUserByEmail
    // check and here — fine, the row will already be there.
    return db.findUserByEmail(email);
  }
  return db.createUserWithId(created.user.id, { name, email, role: "student" });
}
