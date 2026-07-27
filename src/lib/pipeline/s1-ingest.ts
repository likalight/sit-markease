import { db } from "@/lib/db/facade";
import { sidecar } from "@/lib/sidecar/client";
import { getLineDetector } from "./line-detector";

// §7.1/§7.2 — S1 ingest + S1b line detection, factored out of the M1 upload
// route so it's reusable from scripts/seed-gold-submissions.ts (M9's gold
// set needs to go through the same real ingest path, not a shortcut).
export interface IngestResult {
  submissionId: string;
  pageId: string;
  skewDeg: number;
  qualityScore: number;
  boxes: unknown[];
  detector: string;
}

export async function ingestSubmission(
  questionId: string,
  bytes: Buffer,
  contentType: string,
  studentId: string | null
): Promise<IngestResult | { error: string }> {
  const originalB64 = bytes.toString("base64");

  const submission = await db.createSubmission({ questionId, studentId, status: "processing" });

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
    return { error: "line detection failed" };
  }

  const originalPath = `${submission.id}/original.png`;
  const processedPath = `${submission.id}/processed.png`;

  await db.uploadImage(originalPath, bytes, contentType);
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

  return {
    submissionId: submission.id,
    pageId: page.id,
    skewDeg: preprocessResult.skew_deg,
    qualityScore: preprocessResult.quality_score,
    boxes: linesResult.boxes,
    detector: linesResult.source,
  };
}
