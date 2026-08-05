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
  revalidatePath(`/assignments/${assessmentId}/rubric`);
}

export async function releaseAssessmentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") return;
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment || (assessment as any).assessment_mode !== "summative") return;

  const questions = await db.listQuestionsForAssessment(assessmentId);
  let submissionCount = 0;
  for (const question of questions as any[]) {
    const submissions = await db.listSubmissionsForQuestion(question.id);
    submissionCount += submissions.length;
    for (const submission of submissions as any[]) {
      if (!(await db.getFinalGrade(submission.id))) return;
    }
  }
  if (submissionCount === 0) return;
  await db.updateAssessmentStatus(assessmentId, "released");
  await db.insertAuditLog({ actor_id: user.id, entity_type: "assessment", entity_id: assessmentId, action: "release_results", before: { status: (assessment as any).status }, after: { status: "released" } });
  revalidatePath("/assignments");
  revalidatePath("/feedback");
}
