"use server";

import { redirect } from "next/navigation";
import { VALID_STUDENT_IDS } from "@/lib/auth/student-roster";
import { signInAsStudent, signInAsEducator } from "@/lib/auth/demo-signin";

// Lightweight access gate: three fixed student IDs stand in for full signup
// so a student can go straight from the landing page into the submit
// portal, and a single click takes an educator straight into the review
// queue. These are still real Supabase Auth accounts underneath (created on
// first use) so every downstream page — which reads getCurrentUser() off a
// real session — works unmodified; the "gate" is the 3-digit ID check, not
// the password, which is fixed and never shown to the user.
// The actual sign-in logic lives in src/lib/auth/demo-signin.ts, shared with
// the demo-tour actions (src/lib/demo-tour/actions.ts) which need to switch
// persona mid-flow and redirect somewhere other than the fixed destinations
// below.

export async function enterAsStudentAction(formData: FormData) {
  const id = String(formData.get("studentId") ?? "").trim();
  if (!VALID_STUDENT_IDS.includes(id)) {
    redirect(`/enter/student?error=${encodeURIComponent("that student ID isn't recognised")}`);
  }
  try {
    await signInAsStudent(id);
  } catch (err) {
    redirect(`/enter/student?error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
  redirect("/submit");
}

export async function enterAsEducatorAction() {
  try {
    await signInAsEducator();
  } catch (err) {
    redirect(`/login?error=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
  }
  redirect("/review");
}
