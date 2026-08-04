import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";

// POST /api/submissions/:id/criteria — add a rubric item live, mid-review
// (Gradescope's "+Add Rubric Item"). Rubrics were previously only ever
// created once, by AI, at question-creation time (/assignments/new) — this
// is the first path that lets an instructor extend one while grading a
// real submission. The new criterion is written to rubric_criteria (shared
// by every submission of this question, same as an AI-authored one) and a
// matching criterion_results row is created for THIS submission's grade so
// it shows up immediately, satisfying the schema's
// evidence_step_indices-must-be-non-empty constraint (CLAUDE.md rule 4) with
// the step the instructor was looking at when they added it. See
// docs/DECISIONS.md.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "educator role required" } }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, maxScore, evidenceStepIndex } = body as { name?: string; maxScore?: number; evidenceStepIndex?: number };
  if (typeof name !== "string" || !name.trim() || typeof maxScore !== "number" || maxScore <= 0) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "name (string) and maxScore (positive number) are required" } },
      { status: 400 }
    );
  }
  if (typeof evidenceStepIndex !== "number") {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "evidenceStepIndex is required — the step this criterion is tied to" } },
      { status: 400 }
    );
  }

  const submission = await db.getSubmission(submissionId);
  if (!submission) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "unknown submission" } }, { status: 404 });
  }

  const grade = await db.getGradeRecommendation(submissionId);
  if (!grade) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "no grade recommendation for this submission" } }, { status: 404 });
  }

  const question = await db.getQuestionWithRubric((submission as any).question_id);
  if (!question?.rubric) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "this question has no rubric" } }, { status: 404 });
  }

  // Minimal two-level scale (not-met / fully-met) — a manually added item
  // mid-review is a quick "I noticed this, dock/credit it" note, not a
  // fully-designed multi-level AI rubric criterion.
  const key = `custom_${Date.now().toString(36)}`;
  const levels = [
    { level: "not met", score: 0, descriptor: "Not demonstrated." },
    { level: "met", score: maxScore, descriptor: "Fully demonstrated." },
  ];

  const [criterion] = await db.insertRubricCriteria([
    {
      rubric_id: (question.rubric as any).id,
      key,
      name: name.trim(),
      weight: 1,
      max_score: maxScore,
      levels,
    },
  ]);

  const [criterionResult] = await db.insertCriterionResults([
    {
      grade_recommendation_id: (grade as any).id,
      criterion_id: (criterion as any).id,
      criterion_key: key,
      level: "not met",
      score: 0,
      max_score: maxScore,
      evidence_step_indices: [evidenceStepIndex],
      justification: "Added by instructor during review.",
      confidence: null,
    },
  ]);

  return NextResponse.json({
    criterion: { key, name: name.trim(), levels },
    result: {
      criterionKey: key,
      level: "not met",
      score: 0,
      maxScore,
      evidenceStepIndices: [evidenceStepIndex],
      justification: (criterionResult as any).justification,
      confidence: null,
    },
  });
}
