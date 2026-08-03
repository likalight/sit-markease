"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

// Real open/close gate for an assignment (assessments.status) — a "draft"
// assignment's question isn't submittable at all (db.getCurrentQuestion()
// filters on status = 'open'). Toggles between the two states this UI
// actually exposes; 'marking'/'released' are separate lifecycle states not
// driven from here.
export async function setAssessmentStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") return;

  const assessmentId = String(formData.get("assessmentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!assessmentId || (status !== "open" && status !== "draft")) return;

  await db.updateAssessmentStatus(assessmentId, status);
  revalidatePath("/assignments");
}
