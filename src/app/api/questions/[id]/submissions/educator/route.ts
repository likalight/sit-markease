import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveStudentAccount, VALID_STUDENT_IDS } from "@/lib/auth/student-roster";
import { ingestSubmission } from "@/lib/pipeline/s1-ingest";
import { runFullPipeline } from "@/lib/pipeline/orchestrator";

export const maxDuration = 300;

// Educator-on-behalf-of upload — reintroduces, in a scoped form, the
// educator-uploads flow that self-submit (route.ts, sibling) replaced. That
// replacement was correct for formative/self-service work, but a real
// closed-book exam collects physical paper: the student never has it back
// to photograph themselves, so summative needs an intake path where the
// instructor scans and attributes each script to a student ID. Formative
// stays self-submit only — this route rejects anything not summative. See
// docs/DECISIONS.md.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "educator role required" } }, { status: 403 });
  }

  const { id: questionId } = await params;

  const question = await db.getQuestionWithRubric(questionId);
  if (!question) {
    return NextResponse.json({ error: { code: "QUESTION_NOT_FOUND", message: "unknown question id" } }, { status: 404 });
  }

  const assessment = await db.getAssessment((question as any).assessment_id);
  if (!assessment || (assessment as any).assessment_mode !== "summative") {
    return NextResponse.json(
      {
        error: {
          code: "NOT_SUMMATIVE",
          message: "this question isn't part of a summative assessment — formative questions use student self-submit",
        },
      },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const studentId = String(formData.get("studentId") ?? "").trim();

  if (!VALID_STUDENT_IDS.includes(studentId)) {
    return NextResponse.json(
      { error: { code: "INVALID_STUDENT_ID", message: `student ID must be one of: ${VALID_STUDENT_IDS.join(", ")}` } },
      { status: 400 }
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "MISSING_FILE", message: "no file uploaded" } }, { status: 400 });
  }

  const studentAccount = await resolveStudentAccount(studentId);
  if (!studentAccount) {
    return NextResponse.json(
      { error: { code: "STUDENT_NOT_RESOLVED", message: "couldn't resolve that student ID to an account" } },
      { status: 500 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await ingestSubmission(questionId, bytes, file.type || "image/png", (studentAccount as any).id);
  if ("error" in result) {
    return NextResponse.json({ error: { code: "SIDECAR_UNAVAILABLE", message: result.error, recoverable: true } }, { status: 502 });
  }

  const pages = await db.listSubmissionPages(result.submissionId);
  const firstPage = pages.find((p: any) => p.page_index === 0) ?? pages[0];
  const originalUrl = firstPage ? await db.getImageUrl(firstPage.processed_path ?? firstPage.storage_path) : null;
  const pipeline = await runFullPipeline(result.submissionId);

  return NextResponse.json({ ...result, originalUrl, pipeline, studentId, studentName: (studentAccount as any).name });
}
