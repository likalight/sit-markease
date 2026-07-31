import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/facade";
import { getCurrentUser } from "@/lib/auth/current-user";
import { runFullPipelineForTypedInput } from "@/lib/pipeline/orchestrator";

// Same timeout reasoning as the photo upload route (src/app/api/questions/[id]/submissions/route.ts).
export const maxDuration = 300;

// Objective 1 (brief) — a second submission path alongside the photo
// upload: a student who already has their solution as LaTeX/text types it
// directly instead of photographing handwriting, skipping OCR entirely.
// Same rate limit and auto-release behaviour as the photo path.
const RATE_LIMIT_MAX_PER_HOUR = Number(process.env.AIMS_SUBMIT_RATE_LIMIT_PER_HOUR ?? 20);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "student role required" } }, { status: 403 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentCount = await db.countSubmissionsSince(user.id, oneHourAgo);
  if (recentCount >= RATE_LIMIT_MAX_PER_HOUR) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `You've submitted ${recentCount} times in the last hour — please wait before submitting again.`,
        },
      },
      { status: 429 }
    );
  }

  const { id: questionId } = await params;

  const body = await request.json().catch(() => null);
  const steps: unknown = body?.steps;
  if (!Array.isArray(steps) || steps.every((s) => typeof s !== "string")) {
    return NextResponse.json({ error: { code: "MISSING_STEPS", message: "steps must be an array of strings" } }, { status: 400 });
  }
  const rawLatexSteps = (steps as string[]).map((s) => s.trim()).filter(Boolean);
  if (rawLatexSteps.length === 0) {
    return NextResponse.json({ error: { code: "EMPTY_SUBMISSION", message: "type at least one step" } }, { status: 400 });
  }

  const question = await db.getQuestionWithRubric(questionId);
  if (!question) {
    return NextResponse.json({ error: { code: "QUESTION_NOT_FOUND", message: "unknown question id" } }, { status: 404 });
  }

  const submission = await db.createSubmission({
    questionId,
    studentId: user.id,
    status: "processing",
    inputMethod: "typed",
  });

  const pipeline = await runFullPipelineForTypedInput((submission as any).id, rawLatexSteps);

  return NextResponse.json({ submissionId: (submission as any).id, pipeline });
}
