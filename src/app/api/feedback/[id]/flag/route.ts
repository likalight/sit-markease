import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";

// §10 — POST /api/feedback/:id/flag. US10: student flags feedback as wrong
// or unhelpful. The educator-facing review inbox for flags is P1 (§4.2) —
// not built here.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: feedbackId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "student role required" } }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const flag = await db.insertFeedbackFlag({
    feedback_id: feedbackId,
    student_id: user.id,
    reason: body.reason ?? "unhelpful",
    note: body.note ?? null,
  });

  return NextResponse.json({ flagId: (flag as any).id });
}
