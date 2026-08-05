import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { ingestAssessmentScript, materializeMappedSubmissions } from "@/lib/pipeline/script-ingest";

export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return NextResponse.json({ error: { message: "student role required" } }, { status: 403 });
  const { id: assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment || (assessment as any).assessment_mode !== "formative" || (assessment as any).status !== "open") {
    return NextResponse.json({ error: { message: "formative assessment is not open" } }, { status: 400 });
  }
  const assigned = await db.listAssessmentStudents(assessmentId);
  if (!(assigned as any[]).some((row) => row.student_id === user.id)) return NextResponse.json({ error: { message: "assessment is not assigned to you" } }, { status: 403 });

  const formData = await request.formData();
  const attemptId = String(formData.get("attemptId") ?? "");
  const attempt = await db.getAssessmentAttempt(attemptId);
  if (!attempt || (attempt as any).assessment_id !== assessmentId || (attempt as any).student_id !== user.id || (attempt as any).status !== "in_progress") {
    return NextResponse.json({ error: { message: "attempt is not active" } }, { status: 400 });
  }
  if ((attempt as any).expires_at && new Date((attempt as any).expires_at) <= new Date()) {
    await db.updateAssessmentAttempt(attemptId, { status: "expired" });
    return NextResponse.json({ error: { message: "the attempt time has expired" } }, { status: 409 });
  }
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return NextResponse.json({ error: { message: "attach at least one script file" } }, { status: 400 });

  try {
    const result = await ingestAssessmentScript({
      assessmentId,
      studentId: user.id,
      attemptId,
      uploadedBy: user.id,
      uploadKind: "formative",
      documents: await Promise.all(files.map(async (file) => ({ bytes: Buffer.from(await file.arrayBuffer()), contentType: file.type || "image/png" }))),
    });
    await db.updateAssessmentAttempt(attemptId, { status: "submitted", submitted_at: new Date().toISOString() });
    const submissions = result.confident ? await materializeMappedSubmissions(result.scriptUploadId) : [];
    return NextResponse.json({ ...result, submissionIds: (submissions as any[]).map((submission) => submission.id) });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : String(error) } }, { status: 500 });
  }
}
