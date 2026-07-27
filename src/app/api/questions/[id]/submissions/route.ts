import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { sidecar } from "@/lib/sidecar/client";
import { getLineDetector } from "@/lib/pipeline/line-detector";

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
  const originalB64 = bytes.toString("base64");

  const question = await db.getQuestionWithRubric(questionId);
  if (!question) {
    return NextResponse.json(
      { error: { code: "QUESTION_NOT_FOUND", message: "unknown question id" } },
      { status: 404 }
    );
  }

  const studentEmail = process.env.AIMS_DEMO_STUDENT_EMAIL ?? "student@aims.demo";
  const student = await db.findUserByEmail(studentEmail);

  const submission = await db.createSubmission({
    questionId,
    studentId: student?.id ?? null,
    status: "processing",
  });

  let preprocessResult;
  let linesResult;
  try {
    preprocessResult = await sidecar.preprocess(originalB64);
    linesResult = await getLineDetector().detect(preprocessResult.processed_b64);
  } catch (err) {
    await db.logStageRun({
      submissionId: submission.id,
      stage: "S1_ingest",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    await db.updateSubmission(submission.id, { status: "failed" });
    return NextResponse.json(
      { error: { code: "SIDECAR_UNAVAILABLE", message: "line detection failed", recoverable: true } },
      { status: 502 }
    );
  }

  const originalPath = `${submission.id}/original.png`;
  const processedPath = `${submission.id}/processed.png`;

  await db.uploadImage(originalPath, bytes, file.type || "image/png");
  const processedBytes = Buffer.from(preprocessResult.processed_b64, "base64");
  await db.uploadImage(processedPath, processedBytes, "image/png");

  const page = await db.createSubmissionPage({
    submissionId: submission.id,
    pageIndex: 0,
    storagePath: originalPath,
    processedPath,
    skewDeg: preprocessResult.skew_deg,
    qualityScore: preprocessResult.quality_score,
  });

  await db.insertDetectedLines(page.id, linesResult.boxes, linesResult.source);

  await db.logStageRun({ submissionId: submission.id, stage: "S1_ingest", status: "succeeded" });
  await db.updateSubmission(submission.id, { status: "ready_for_review" });

  const originalUrl = await db.getImageUrl(originalPath);

  return NextResponse.json({
    submissionId: submission.id,
    pageId: page.id,
    originalUrl,
    skewDeg: preprocessResult.skew_deg,
    qualityScore: preprocessResult.quality_score,
    boxes: linesResult.boxes,
    detector: linesResult.source,
  });
}
