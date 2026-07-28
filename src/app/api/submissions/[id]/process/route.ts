import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runFullPipeline } from "@/lib/pipeline/orchestrator";

// §10 — POST /api/submissions/:id/process
// Runs S2 (dual-read) + S3 (reconcile) + S4 (assess) + S5 (diagnose) + S6
// (feedback) + S7 (targeted practice).
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "educator role required" } }, { status: 403 });
  }

  const { id: submissionId } = await params;
  const result = await runFullPipeline(submissionId);
  return NextResponse.json(result);
}
