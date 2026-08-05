import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveStudentAccount, VALID_STUDENT_IDS } from "@/lib/auth/student-roster";
import { db } from "@/lib/db/facade";
import { ingestAssessmentScript } from "@/lib/pipeline/script-ingest";

export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") return NextResponse.json({ error: { message: "educator role required" } }, { status: 403 });
  const { id: assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment || (assessment as any).assessment_mode !== "summative") return NextResponse.json({ error: { message: "summative assessment required" } }, { status: 400 });
  const formData = await request.formData();
  const studentNumber = String(formData.get("studentId") ?? "").trim();
  if (!VALID_STUDENT_IDS.includes(studentNumber)) return NextResponse.json({ error: { message: "choose a valid student" } }, { status: 400 });
  const student = await resolveStudentAccount(studentNumber);
  if (!student) return NextResponse.json({ error: { message: "student could not be resolved" } }, { status: 400 });
  const assigned = await db.listAssessmentStudents(assessmentId);
  if (!(assigned as any[]).some((row) => row.student_id === (student as any).id)) return NextResponse.json({ error: { message: "student is not assigned to this assessment" } }, { status: 403 });
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return NextResponse.json({ error: { message: "attach at least one script file" } }, { status: 400 });

  try {
    const result = await ingestAssessmentScript({
      assessmentId,
      studentId: (student as any).id,
      uploadedBy: user.id,
      uploadKind: "summative",
      documents: await Promise.all(files.map(async (file) => ({ bytes: Buffer.from(await file.arrayBuffer()), contentType: file.type || "image/png" }))),
    });
    return NextResponse.json({ ...result, studentName: (student as any).name, studentId: studentNumber });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : String(error) } }, { status: 500 });
  }
}
