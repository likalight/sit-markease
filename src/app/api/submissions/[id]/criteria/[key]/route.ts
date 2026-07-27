import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";

// §10 — PUT /api/submissions/:id/criteria/:key {level, score, note}. Design
// system §4 keyboard model: "1"-"5" sets the level on the focused criterion.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id: submissionId, key: criterionKey } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "educator role required" } }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { level, score, note } = body as { level?: string; score?: number; note?: string };
  if (typeof level !== "string" || typeof score !== "number") {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "level (string) and score (number) are required" } }, { status: 400 });
  }

  const grade = await db.getGradeRecommendation(submissionId);
  if (!grade) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "no grade recommendation for this submission" } }, { status: 404 });
  }

  const criteria = await db.listCriterionResults((grade as any).id);
  const criterion = criteria.find((c: any) => c.criterion_key === criterionKey);
  if (!criterion) {
    return NextResponse.json({ error: { code: "CRITERION_NOT_FOUND", message: `no criterion ${criterionKey}` } }, { status: 404 });
  }

  await db.updateCriterionResult(criterion.id, {
    level,
    score,
    justification: note ? `${criterion.justification}\n\n[Educator note: ${note}]` : criterion.justification,
  });

  return NextResponse.json({ ok: true });
}
