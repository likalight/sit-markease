import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";

// PUT /api/submissions/:id/feedback — lets the instructor edit the actual
// text that will be released to the student (summary/next_action) before
// approving. Nicholas's "instructor marking mode": verify both the score
// AND the feedback, not just the score.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "educator role required" } }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { summary, next_action } = body as { summary?: string; next_action?: string };
  if (typeof summary !== "string" && typeof next_action !== "string") {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "summary or next_action is required" } },
      { status: 400 }
    );
  }

  const feedback = await db.getFeedback(submissionId);
  if (!feedback) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "no feedback for this submission" } }, { status: 404 });
  }

  const patch: Record<string, unknown> = { edited_by_human: true };
  if (typeof summary === "string") patch.summary = summary;
  if (typeof next_action === "string") patch.next_action = next_action;
  await db.updateFeedback((feedback as any).id, patch);

  return NextResponse.json({ ok: true });
}
