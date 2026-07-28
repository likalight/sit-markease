import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runFullPipeline } from "@/lib/pipeline/orchestrator";

// See the identical note in api/questions/[id]/submissions/route.ts — this
// route runs the same full S2-S7 chain and needs the same raised timeout.
export const maxDuration = 300;

// §10 — POST /api/submissions/:id/process
// Runs S2 (transcribe) + S3 (assess quality) + S4 (assess) + S5 (diagnose) + S6
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
