import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveStudentAccount, VALID_STUDENT_IDS } from "@/lib/auth/student-roster";
import { db } from "@/lib/db/facade";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "script";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function isPdfUpload(file: any) {
  const name = String(file?.name ?? "").toLowerCase();
  const contentType = String(file?.contentType ?? "").toLowerCase();
  return name.endsWith(".pdf") || contentType === "application/pdf";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("sign in required", 403);

  const { id: assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) return jsonError("assessment not found", 404);

  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "summative" ? "summative" : "formative";
  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) return jsonError("no files requested", 400);
  if (files.some(isPdfUpload)) {
    return jsonError(
      "PDFs must be rendered in the browser before script upload. Hard refresh this page, then choose the PDF again or use the built-in demo script.",
      400
    );
  }

  if (kind === "formative") {
    if (user.role !== "student" || (assessment as any).assessment_mode !== "formative" || (assessment as any).status !== "open") {
      return jsonError("formative assessment is not open", 400);
    }
    const assigned = await db.listAssessmentStudents(assessmentId);
    if (!(assigned as any[]).some((row) => row.student_id === user.id)) return jsonError("assessment is not assigned to you", 403);
    const attempt = await db.getAssessmentAttempt(String(body.attemptId ?? ""));
    if (!attempt || (attempt as any).assessment_id !== assessmentId || (attempt as any).student_id !== user.id || (attempt as any).status !== "in_progress") {
      return jsonError("attempt is not active", 400);
    }
  } else {
    if (user.role !== "educator" || (assessment as any).assessment_mode !== "summative") {
      return jsonError("summative educator upload required", 403);
    }
    const studentNumber = String(body.studentId ?? "").trim();
    if (!VALID_STUDENT_IDS.includes(studentNumber)) return jsonError("choose a valid student", 400);
    const student = await resolveStudentAccount(studentNumber);
    const assigned = await db.listAssessmentStudents(assessmentId);
    if (!student || !(assigned as any[]).some((row) => row.student_id === (student as any).id)) {
      return jsonError("student is not assigned to this assessment", 403);
    }
  }

  const uploads = await Promise.all(
    files.map(async (file: any) => {
      const path = `scripts/raw/${assessmentId}/${user.id}/${randomUUID()}-${safeName(String(file.name ?? "script"))}`;
      const signed = await db.createSignedUploadUrl(path);
      return {
        path,
        token: (signed as any).token,
        signedUrl: (signed as any).signedUrl,
        contentType: String(file.contentType || "application/octet-stream"),
      };
    })
  );

  return NextResponse.json({ uploads });
}
