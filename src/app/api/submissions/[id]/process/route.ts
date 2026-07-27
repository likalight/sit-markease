import { NextResponse, type NextRequest } from "next/server";
import { transcribeSubmission } from "@/lib/pipeline/s2-transcribe";
import { assessSubmission } from "@/lib/pipeline/s4-assess";
import { diagnoseSubmission } from "@/lib/pipeline/s5-diagnose";
import { generateFeedback } from "@/lib/pipeline/s6-feedback";

// §10 — POST /api/submissions/:id/process
// Runs S2 (dual-read) + S3 (reconcile) + S4 (assess) + S5 (diagnose) + S6
// (feedback). Extended further once M7's practice generation lands.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const transcribeResult = await transcribeSubmission(submissionId);

  if (transcribeResult.status === "needs_human_transcription" || transcribeResult.status === "failed") {
    return NextResponse.json(transcribeResult);
  }

  const assessResult = await assessSubmission(submissionId);
  const diagnoseResult = assessResult.status === "assessed" ? await diagnoseSubmission(submissionId) : { status: "failed" };
  const feedbackResult = assessResult.status === "assessed" ? await generateFeedback(submissionId) : { status: "failed" };

  return NextResponse.json({
    ...transcribeResult,
    assess: assessResult,
    diagnose: diagnoseResult,
    feedback: feedbackResult,
  });
}
