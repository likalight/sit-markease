import { NextResponse, type NextRequest } from "next/server";
import { transcribeSubmission } from "@/lib/pipeline/s2-transcribe";

// §10 — POST /api/submissions/:id/process
// M2 scope: runs S2 (dual-read) + S3 (reconcile). Later milestones extend
// this to chain S4-S7 as they land (see src/lib/pipeline/orchestrator.ts once
// M4 introduces it).
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const result = await transcribeSubmission(submissionId);
  return NextResponse.json(result);
}
