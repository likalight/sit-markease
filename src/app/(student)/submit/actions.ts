"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

export async function startAssessmentAttemptAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment || (assessment as any).assessment_mode !== "formative" || (assessment as any).status !== "open") {
    redirect("/submit?error=assessment%20is%20not%20available");
  }
  const assigned = await db.listAssessmentStudents(assessmentId);
  if (!(assigned as any[]).some((row) => row.student_id === user.id)) redirect("/submit?error=assessment%20is%20not%20assigned%20to%20you");

  const now = new Date();
  const opensAt = (assessment as any).opens_at ? new Date((assessment as any).opens_at) : null;
  const dueAt = (assessment as any).due_at ? new Date((assessment as any).due_at) : null;
  if (opensAt && now < opensAt) redirect("/submit?error=assessment%20has%20not%20opened");
  if (dueAt && now >= dueAt) redirect("/submit?error=assessment%20deadline%20has%20passed");

  const attempts = (await db.listAssessmentAttempts(assessmentId, user.id)) as any[];
  const active = attempts.find((attempt) => attempt.status === "in_progress" && (!attempt.expires_at || new Date(attempt.expires_at) > now));
  if (active) redirect(`/work/${assessmentId}?attempt=${active.id}`);
  const allowed = Number((assessment as any).attempts_allowed ?? 1);
  if (attempts.length >= allowed) redirect("/submit?error=no%20attempts%20remaining");

  const duration = Number((assessment as any).duration_minutes ?? 0);
  let expiresAt = duration > 0 ? new Date(now.getTime() + duration * 60_000) : dueAt;
  if (expiresAt && dueAt && expiresAt > dueAt) expiresAt = dueAt;
  const attempt = await db.createAssessmentAttempt({
    assessment_id: assessmentId,
    student_id: user.id,
    attempt_number: attempts.length + 1,
    started_at: now.toISOString(),
    expires_at: expiresAt?.toISOString() ?? null,
    status: "in_progress",
  });
  redirect(`/work/${assessmentId}?attempt=${(attempt as any).id}`);
}
