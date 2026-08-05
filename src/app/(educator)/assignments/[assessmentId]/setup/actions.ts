"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveStudentAccount, VALID_STUDENT_IDS } from "@/lib/auth/student-roster";
import { db } from "@/lib/db/facade";

function singaporeIso(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}:00+08:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function saveAssessmentSetupAction(assessmentId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) redirect("/assignments");

  const title = String(formData.get("title") ?? "").trim();
  const durationRaw = Number(formData.get("durationMinutes") ?? 0);
  const attemptsRaw = Number(formData.get("attemptsAllowed") ?? 1);
  const selectedIds = VALID_STUDENT_IDS.filter((id) => formData.getAll("studentIds").includes(id));

  const students = (await Promise.all(selectedIds.map(resolveStudentAccount))).filter(Boolean) as any[];
  await db.updateAssessment(assessmentId, {
    title: title || (assessment as any).title,
    opens_at: singaporeIso(formData.get("opensAt")),
    due_at: singaporeIso(formData.get("dueAt")),
    duration_minutes: durationRaw > 0 ? Math.round(durationRaw) : null,
    attempts_allowed: Math.max(1, Math.round(attemptsRaw || 1)),
  });
  await db.replaceAssessmentStudents(assessmentId, students.map((student) => student.id));

  revalidatePath("/assignments");
  revalidatePath(`/assignments/${assessmentId}/setup`);
}
