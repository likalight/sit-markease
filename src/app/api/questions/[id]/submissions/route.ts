import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { ingestSubmission } from "@/lib/pipeline/s1-ingest";

// §10 — POST /api/questions/:id/submissions
// M1 scope: single-image upload → S1 preprocess → S1b line detection →
// persisted submission/page/lines. Batch upload and PDF ingestion are later work
// (see docs/STUBS.md). Persists through src/lib/db/facade.ts, which branches
// on AIMS_FIXTURE_MODE (docs/DECISIONS.md "M2 — free-tier providers").
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: questionId } = await params;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "MISSING_FILE", message: "no file uploaded" } }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const question = await db.getQuestionWithRubric(questionId);
  if (!question) {
    return NextResponse.json(
      { error: { code: "QUESTION_NOT_FOUND", message: "unknown question id" } },
      { status: 404 }
    );
  }

  const studentEmail = process.env.AIMS_DEMO_STUDENT_EMAIL ?? "student@aims.demo";
  const student = await db.findUserByEmail(studentEmail);

  const result = await ingestSubmission(questionId, bytes, file.type || "image/png", student?.id ?? null);
  if ("error" in result) {
    return NextResponse.json(
      { error: { code: "SIDECAR_UNAVAILABLE", message: result.error, recoverable: true } },
      { status: 502 }
    );
  }

  const originalUrl = await db.getImageUrl(`${result.submissionId}/original.png`);

  return NextResponse.json({ ...result, originalUrl });
}
