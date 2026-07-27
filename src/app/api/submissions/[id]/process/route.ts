import { NextResponse, type NextRequest } from "next/server";
import { transcribeSubmission } from "@/lib/pipeline/s2-transcribe";
import { assessSubmission } from "@/lib/pipeline/s4-assess";

// §10 — POST /api/submissions/:id/process
// Runs S2 (dual-read) + S3 (reconcile) + S4 (assess). Extended further as
// M6/M7 land (see src/lib/pipeline/orchestrator.ts once that exists).
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const transcribeResult = await transcribeSubmission(submissionId);

  if (transcribeResult.status === "needs_human_transcription" || transcribeResult.status === "failed") {
    return NextResponse.json(transcribeResult);
  }

  const assessResult = await assessSubmission(submissionId);
  return NextResponse.json({ ...transcribeResult, assess: assessResult });
}
