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
  pageCount: number;
}

async function ingestOnePage(
  submissionId: string,
  pageIndex: number,
  bytes: Buffer,
  contentType: string
) {
  const originalB64 = bytes.toString("base64");
  const preprocessResult = await sidecar.preprocess(originalB64);
  const linesResult = await getLineDetector().detect(preprocessResult.processed_b64);

  const originalPath = `${submissionId}/original-${pageIndex}.png`;
  const processedPath = `${submissionId}/processed-${pageIndex}.png`;

  await db.uploadImage(originalPath, bytes, contentType);
  const processedBytes = Buffer.from(preprocessResult.processed_b64, "base64");
  await db.uploadImage(processedPath, processedBytes, "image/png");

  const page = await db.createSubmissionPage({
    submissionId,
    pageIndex,
    storagePath: originalPath,
    processedPath,
    skewDeg: preprocessResult.skew_deg,
    qualityScore: preprocessResult.quality_score,
  });

  await db.insertDetectedLines(page.id, linesResult.boxes, linesResult.source);

  return { page, preprocessResult, linesResult };
}

export async function ingestSubmission(
  questionId: string,
  bytes: Buffer,
  contentType: string,
  studentId: string | null
): Promise<IngestResult | { error: string }> {
  const submission = await db.createSubmission({ questionId, studentId, status: "processing" });

  // PDF -> one PNG per page (sidecar/pdf.py, pdf2image). Every page is
  // stored as its own submission_page (page_index 0..n), matching the
  // schema's existing multi-page shape. Scope cut, documented rather than
  // silently half-done: transcription/grading (S2 onward) still reads only
  // page 0 — the rest of the pipeline is single-page-aware end to end, so a
  // multi-page PDF's later pages are preserved but not yet graded. Fixing
  // that is a transcription-layer change (concatenating multiple images
  // into one read call), not an ingest one.
  let pageByteSets: { bytes: Buffer; contentType: string }[];
  if (contentType === "application/pdf") {
    let converted;
    try {
      converted = await sidecar.pdfToImages(bytes.toString("base64"));
    } catch (err) {
      await db.logStageRun({
        submissionId: submission.id,
        stage: "S1_ingest",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
      await db.updateSubmission(submission.id, { status: "failed" });
      return { error: "pdf conversion failed" };
    }
    pageByteSets = converted.images_b64.map((b64) => ({ bytes: Buffer.from(b64, "base64"), contentType: "image/png" }));
  } else {
    pageByteSets = [{ bytes, contentType }];
  }

  let firstPage;
  try {
    for (let i = 0; i < pageByteSets.length; i++) {
      const result = await ingestOnePage(submission.id, i, pageByteSets[i].bytes, pageByteSets[i].contentType);
      if (i === 0) firstPage = result;
    }
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

  await db.logStageRun({ submissionId: submission.id, stage: "S1_ingest", status: "succeeded" });
  await db.updateSubmission(submission.id, { status: "ready_for_review" });

  return {
    submissionId: submission.id,
    pageId: firstPage!.page.id,
    skewDeg: firstPage!.preprocessResult.skew_deg,
    qualityScore: firstPage!.preprocessResult.quality_score,
    boxes: firstPage!.linesResult.boxes,
    detector: firstPage!.linesResult.source,
    pageCount: pageByteSets.length,
  };
}
