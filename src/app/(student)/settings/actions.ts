"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

export async function setFeedbackToneAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const tone = String(formData.get("tone") ?? "supportive");
  if (tone !== "supportive" && tone !== "concise" && tone !== "socratic") {
    redirect("/settings?error=" + encodeURIComponent("pick a valid tone"));
  }

  await db.updateUserFeedbackTone(user.id, tone as "supportive" | "concise" | "socratic");
  redirect("/settings?saved=1");
}
