import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { ingestAssessmentScript, materializeMappedSubmissions } from "@/lib/pipeline/script-ingest";
import { documentsFromFormFiles, documentsFromStorageReferences } from "@/lib/pipeline/script-upload-documents";

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

  const isJson = request.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await request.json().catch(() => ({})) : null;
  const formData = isJson ? null : await request.formData();
  const attemptId = String(isJson ? payload?.attemptId ?? "" : formData?.get("attemptId") ?? "");
  const attempt = await db.getAssessmentAttempt(attemptId);
  if (!attempt || (attempt as any).assessment_id !== assessmentId || (attempt as any).student_id !== user.id || (attempt as any).status !== "in_progress") {
    return NextResponse.json({ error: { message: "attempt is not active" } }, { status: 400 });
  }
  if ((attempt as any).expires_at && new Date((attempt as any).expires_at) <= new Date()) {
    await db.updateAssessmentAttempt(attemptId, { status: "expired" });
    return NextResponse.json({ error: { message: "the attempt time has expired" } }, { status: 409 });
  }
  const files = isJson ? [] : formData!.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

  try {
    const documents = isJson
      ? await documentsFromStorageReferences(assessmentId, Array.isArray(payload?.files) ? payload.files : [])
      : await documentsFromFormFiles(files);
    const result = await ingestAssessmentScript({
      assessmentId,
      studentId: user.id,
      attemptId,
      uploadedBy: user.id,
      uploadKind: "formative",
      documents,
    });
    await db.updateAssessmentAttempt(attemptId, { status: "submitted", submitted_at: new Date().toISOString() });
    // Formative has no instructor gate by design (docs/DECISIONS.md) — the
    // mapping-confidence check that summative uses to route to a human
    // review screen doesn't apply here; a student has nowhere to send a
    // "needs mapping review" state to. Whatever questions were mapped are
    // materialized and graded; the existing per-submission auto-release
    // logic is the real safety net for low-confidence individual answers.
    const submissions = result.mappings.length > 0 ? await materializeMappedSubmissions(result.scriptUploadId) : [];
    return NextResponse.json({ ...result, submissionIds: (submissions as any[]).map((submission) => submission.id) });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : String(error) } }, { status: 500 });
  }
}
