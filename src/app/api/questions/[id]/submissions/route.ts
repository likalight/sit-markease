import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ingestSubmission } from "@/lib/pipeline/s1-ingest";
import { runFullPipeline } from "@/lib/pipeline/orchestrator";

// S2-S7 is several sequential real network calls (a transcription read,
// assess, diagnose, feedback, then practice generation with per-item
// verification) — found live to reliably exceed Vercel's default
// serverless timeout, which silently kills the function mid-pipeline with
// no error ever reaching stage_runs (S7 in particular never even got a
// "failed" row logged — the request was simply cut off before it got
// there). Raise to the platform max so a real submission has room to finish.
export const maxDuration = 300;

// §10 — POST /api/questions/:id/submissions
// Students submit their own work directly (not an educator uploading on
// their behalf) — image or PDF upload → S1 preprocess → S1b line detection
// → persisted submission/page(s)/lines, then immediately runs S2-S6 (see
// src/lib/pipeline/orchestrator.ts). Every result, confident or not, waits
// for an explicit educator approval (CLAUDE.md rule 3) — there is no
// auto-release. S7 (practice generation) is a separate student-triggered
// action after approval, not part of this chain. Batch upload is later
// work (see docs/STUBS.md). Persists
// through src/lib/db/facade.ts, which branches on AIMS_FIXTURE_MODE
// (docs/DECISIONS.md "M2 — free-tier providers").
// Every accepted submission triggers real, billed OpenAI calls with no
// free-tier fallback — the public 3-ID student gate had no throttle at
// all (docs/STUBS.md), which is a real cost-exposure risk, not just an
// abuse one. A generous per-student rolling window keeps real testing
// unaffected while capping runaway/malicious submission spam.
const RATE_LIMIT_MAX_PER_HOUR = Number(process.env.AIMS_SUBMIT_RATE_LIMIT_PER_HOUR ?? 20);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "student role required" } }, { status: 403 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentCount = await db.countSubmissionsSince(user.id, oneHourAgo);
  if (recentCount >= RATE_LIMIT_MAX_PER_HOUR) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `You've submitted ${recentCount} times in the last hour — please wait before submitting again.`,
        },
      },
      { status: 429 }
    );
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
