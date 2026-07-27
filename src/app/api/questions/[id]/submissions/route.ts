import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { sidecar } from "@/lib/sidecar/client";
import { getLineDetector } from "@/lib/pipeline/line-detector";

// §10 — POST /api/questions/:id/submissions
// M1 scope: single-image upload → S1 preprocess → S1b line detection →
// persisted submission/page/lines. Batch upload and PDF ingestion are later work
// (see docs/STUBS.md).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: questionId } = await params;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "MISSING_FILE", message: "no file uploaded" } }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const originalB64 = bytes.toString("base64");

  const admin = supabaseAdmin();

  const { data: question, error: questionError } = await admin
    .from("questions")
    .select("id")
    .eq("id", questionId)
    .single();
  if (questionError || !question) {
    return NextResponse.json(
      { error: { code: "QUESTION_NOT_FOUND", message: "unknown question id" } },
      { status: 404 }
    );
  }

  const studentEmail = process.env.AIMS_DEMO_STUDENT_EMAIL ?? "student@aims.demo";
  const { data: student } = await admin.from("users").select("id").eq("email", studentEmail).maybeSingle();

  const { data: submission, error: submissionError } = await admin
    .from("submissions")
    .insert({ question_id: questionId, student_id: student?.id ?? null, status: "processing" })
    .select("id")
    .single();
  if (submissionError || !submission) {
    return NextResponse.json(
      { error: { code: "SUBMISSION_CREATE_FAILED", message: submissionError?.message } },
      { status: 500 }
    );
  }

  let preprocessResult;
  let linesResult;
  try {
    preprocessResult = await sidecar.preprocess(originalB64);
    linesResult = await getLineDetector().detect(preprocessResult.processed_b64);
  } catch (err) {
    await admin
      .from("stage_runs")
      .insert({
        submission_id: submission.id,
        stage: "S1_ingest",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    await admin.from("submissions").update({ status: "failed" }).eq("id", submission.id);
    return NextResponse.json(
      { error: { code: "SIDECAR_UNAVAILABLE", message: "line detection failed", recoverable: true } },
      { status: 502 }
    );
  }

  const originalPath = `${submission.id}/original.png`;
  const processedPath = `${submission.id}/processed.png`;

  const { error: uploadOriginalError } = await admin.storage
    .from("submissions")
    .upload(originalPath, bytes, { contentType: file.type || "image/png", upsert: true });
  if (uploadOriginalError) {
    return NextResponse.json(
      { error: { code: "STORAGE_UPLOAD_FAILED", message: uploadOriginalError.message } },
      { status: 500 }
    );
  }

  const processedBytes = Buffer.from(preprocessResult.processed_b64, "base64");
  await admin.storage
    .from("submissions")
    .upload(processedPath, processedBytes, { contentType: "image/png", upsert: true });

  const { data: page, error: pageError } = await admin
    .from("submission_pages")
    .insert({
      submission_id: submission.id,
      page_index: 0,
      storage_path: originalPath,
      processed_path: processedPath,
      skew_deg: preprocessResult.skew_deg,
      quality_score: preprocessResult.quality_score,
    })
    .select("id")
    .single();
  if (pageError || !page) {
    return NextResponse.json(
      { error: { code: "PAGE_CREATE_FAILED", message: pageError?.message } },
      { status: 500 }
    );
  }

  const lineRows = linesResult.boxes.map((box, index) => ({
    submission_page_id: page.id,
    line_index: index + 1,
    box,
    detector: linesResult.source,
  }));
  if (lineRows.length > 0) {
    await admin.from("detected_lines").insert(lineRows);
  }

  await admin
    .from("stage_runs")
    .insert({
      submission_id: submission.id,
      stage: "S1_ingest",
      status: "succeeded",
    });
  await admin.from("submissions").update({ status: "ready_for_review" }).eq("id", submission.id);

  const { data: signed } = await admin.storage
    .from("submissions")
    .createSignedUrl(originalPath, 3600);

  return NextResponse.json({
    submissionId: submission.id,
    pageId: page.id,
    originalUrl: signed?.signedUrl,
    skewDeg: preprocessResult.skew_deg,
    qualityScore: preprocessResult.quality_score,
    boxes: linesResult.boxes,
    detector: linesResult.source,
  });
}
