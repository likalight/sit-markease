import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runFullPipeline } from "@/lib/pipeline/orchestrator";
import { db } from "@/lib/db/facade";

// See the identical note in api/questions/[id]/submissions/route.ts — this
// route runs the same full S2-S7 chain and needs the same raised timeout.
export const maxDuration = 300;

// §10 — POST /api/submissions/:id/process
// Runs S2 (transcribe) + S3 (assess quality) + S4 (assess) + S5 (diagnose) + S6
// (feedback). S7 (targeted practice) no longer runs here — it's a
// student-triggered action, see api/submissions/[id]/request-revision.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id: submissionId } = await params;
  if (!user) return NextResponse.json({ error: { code: "FORBIDDEN", message: "sign in required" } }, { status: 403 });
  const submission = await db.getSubmission(submissionId);
  if (!submission || (user.role !== "educator" && (submission as any).student_id !== user.id)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "you cannot process this submission" } }, { status: 403 });
  }
  const result = await runFullPipeline(submissionId);
  return NextResponse.json(result);
}
