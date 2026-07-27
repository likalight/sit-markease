import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";

// §10 — PUT /api/submissions/:id/steps/:idx. Human transcription correction
// (design system §4 keyboard model: "E" edits the focused step). Marks
// edited_by_human so the review console can show it was corrected.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const { id: submissionId, idx } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "educator role required" } }, { status: 403 });
  }

  const stepIndex = Number(idx);
  if (!Number.isInteger(stepIndex)) {
    return NextResponse.json({ error: { code: "INVALID_STEP_INDEX", message: "idx must be an integer" } }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const plainText = typeof body.plain_text === "string" ? body.plain_text : null;
  if (plainText === null) {
    return NextResponse.json({ error: { code: "MISSING_PLAIN_TEXT", message: "plain_text is required" } }, { status: 400 });
  }

  const transcription = await db.getTranscription(submissionId);
  if (!transcription) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "no transcription for this submission" } }, { status: 404 });
  }

  const steps = await db.listSolutionSteps(transcription.id);
  const step = steps.find((s: any) => s.step_index === stepIndex);
  if (!step) {
    return NextResponse.json({ error: { code: "STEP_NOT_FOUND", message: `no step ${stepIndex}` } }, { status: 404 });
  }

  await db.updateSolutionStep(step.id, { plain_text: plainText, edited_by_human: true, source: "human" });

  return NextResponse.json({ ok: true });
}
