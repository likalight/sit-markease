import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";
import { generatePracticeSet } from "@/lib/pipeline/s7-practice";

// Generation + per-item verification is several sequential real network
// calls (same shape of concern as the full pipeline's maxDuration=300 in
// api/submissions/[id]/process/route.ts, just one stage instead of six) —
// give it real room rather than risking a silent mid-request kill.
export const maxDuration = 60;

// POST /api/submissions/:id/request-revision — the student-triggered
// counterpart to S7 practice generation, which used to fire automatically
// right after grading (see docs/DECISIONS.md). Matches the pitch deck's
// "student sees gap & requests revision" step: a student can only ask for
// practice on a submission they own, and only once it's actually been
// graded and released (a final_grade exists) — there's no gap to revise
// against before that.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "student role required" } }, { status: 403 });
  }

  const submission = await db.getSubmission(submissionId);
  if (!submission || (submission as any).student_id !== user.id) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "submission not found" } }, { status: 404 });
  }

  const finalGrade = await db.getFinalGrade(submissionId);
  if (!finalGrade) {
    return NextResponse.json(
      { error: { code: "NOT_GRADED", message: "this submission hasn't been graded and released yet" } },
      { status: 400 }
    );
  }
  const question = await db.getQuestionWithRubric((submission as any).question_id);
  const assessment = question ? await db.getAssessment((question as any).assessment_id) : null;
  if ((assessment as any)?.assessment_mode !== "formative" && (assessment as any)?.status !== "released") {
    return NextResponse.json(
      { error: { code: "NOT_RELEASED", message: "this assessment has not been released yet" } },
      { status: 403 }
    );
  }

  const result = await generatePracticeSet(submissionId);

  await db.insertAuditLog({
    actor_id: user.id,
    entity_type: "submission",
    entity_id: submissionId,
    action: "request_revision",
    before: null,
    after: { status: result.status, itemCount: result.itemCount },
  });

  return NextResponse.json(result);
}
