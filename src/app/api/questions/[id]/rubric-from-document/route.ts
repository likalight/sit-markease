import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { extractQuestionAndRubric } from "@/lib/pipeline/document-extract";
import { structureRubric } from "@/lib/pipeline/rubric-structure";

export const maxDuration = 120;

async function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") return jsonError("educator role required", 403);

  const { id: questionId } = await params;
  const question = await db.getQuestionWithRubric(questionId);
  if (!question?.rubric) return jsonError("question rubric not found", 404);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return jsonError("upload a rubric PDF or image", 400);

  try {
    const extracted = await extractQuestionAndRubric(Buffer.from(await file.arrayBuffer()), file.type || "image/png", {
      targetQuestion: question.prompt_text,
    });
    const rubric = await structureRubric({
      promptText: question.prompt_text,
      modelSolution: extracted.model_solution || question.model_solution || "",
      maxScore: extracted.max_score || question.max_score,
      rawRubricNotes: extracted.raw_rubric_notes,
    });

    return NextResponse.json({
      criteria: rubric.criteria,
      extracted,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 502);
  }
}
