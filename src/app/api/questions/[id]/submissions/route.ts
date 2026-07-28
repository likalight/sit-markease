import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ingestSubmission } from "@/lib/pipeline/s1-ingest";
import { runFullPipeline } from "@/lib/pipeline/orchestrator";

// §10 — POST /api/questions/:id/submissions
// Students submit their own work directly (not an educator uploading on
// their behalf) — image or PDF upload → S1 preprocess → S1b line detection
// → persisted submission/page(s)/lines, then immediately runs S2-S7 (see
// src/lib/pipeline/orchestrator.ts), which also auto-releases the grade if
// it's confident. Batch upload is later work (see docs/STUBS.md). Persists
// through src/lib/db/facade.ts, which branches on AIMS_FIXTURE_MODE
// (docs/DECISIONS.md "M2 — free-tier providers").
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "student role required" } }, { status: 403 });
  }

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

  const result = await ingestSubmission(questionId, bytes, file.type || "image/png", user.id);
  if ("error" in result) {
    return NextResponse.json(
      { error: { code: "SIDECAR_UNAVAILABLE", message: result.error, recoverable: true } },
      { status: 502 }
    );
  }

  const pages = await db.listSubmissionPages(result.submissionId);
  const firstPage = pages.find((p: any) => p.page_index === 0) ?? pages[0];
  const originalUrl = firstPage ? await db.getImageUrl(firstPage.storage_path) : null;
  const pipeline = await runFullPipeline(result.submissionId);

  return NextResponse.json({ ...result, originalUrl, pipeline });
}
