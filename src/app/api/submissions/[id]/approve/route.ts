import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";

// §10 — POST /api/submissions/:id/approve {review_seconds} -> final_grades + audit_log
// CLAUDE.md rule 3: nothing writes final_grades without this explicit
// educator approval action, and every approval writes an audit_log row.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "educator role required" } }, { status: 403 });
  }

  const body = await request.json();
  const { totalScore, adjusted, adjustmentNote, internalNote, reviewSeconds } = body as {
    totalScore: number;
    adjusted: boolean;
    adjustmentNote?: string;
    internalNote?: string;
    reviewSeconds: number;
  };

  const grade = await db.getGradeRecommendation(submissionId);
  if (!grade) {
    return NextResponse.json({ error: { code: "NO_RECOMMENDATION", message: "no grade recommendation to approve" } }, { status: 400 });
  }

  // Bounds-check the score at this boundary regardless of what the client
  // sent — the manual-override UI clamps client-side, but a system boundary
  // shouldn't rely on that alone (e.g. a stale client, a direct API call).
  const maxTotal = (grade as any).max_total;
  if (typeof totalScore !== "number" || !Number.isFinite(totalScore) || totalScore < 0 || totalScore > maxTotal) {
    return NextResponse.json(
      { error: { code: "INVALID_SCORE", message: `totalScore must be between 0 and ${maxTotal}` } },
      { status: 400 }
    );
  }

  const finalGrade = await db.createFinalGrade({
    submission_id: submissionId,
    total: totalScore,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    adjusted,
    adjustment_note: adjustmentNote ?? null,
    // Instructor-only note — never surfaced on the student feedback page,
    // unlike adjustment_note (which is about the score) or feedback.summary
    // (which is what the student reads). See docs/DECISIONS.md.
    internal_note: internalNote ?? null,
    review_seconds: reviewSeconds,
  });

  await db.insertAuditLog({
    actor_id: user.id,
    entity_type: "submission",
    entity_id: submissionId,
    action: "approve",
    before: { total_recommended: (grade as any).total_recommended },
    after: { total: totalScore, adjusted },
  });

  await db.updateSubmission(submissionId, { status: "approved" });

  return NextResponse.json({ finalGradeId: (finalGrade as any).id });
}
