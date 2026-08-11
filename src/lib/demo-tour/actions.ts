"use server";

import { redirect } from "next/navigation";
import { signInAsStudent, signInAsEducator } from "@/lib/auth/demo-signin";

// Quick persona switch for live demos — sign in as either real role and
// land on a chosen page, no typing. What's left after retiring the
// self-serve guided-tour overlay (that walked a visitor through both
// flows automatically); this piece is still useful when presenting live
// and needing to jump between the instructor and student view quickly.
export async function switchRoleAction(role: "student" | "educator", redirectTo: string) {
  if (role === "student") {
    await signInAsStudent("111");
  } else {
    await signInAsEducator();
  }
  redirect(redirectTo);
}
