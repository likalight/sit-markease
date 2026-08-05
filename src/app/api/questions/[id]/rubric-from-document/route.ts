import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { extractQuestionAndRubricFromDocuments } from "@/lib/pipeline/document-extract";
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
  const multiFiles = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  const singleFile = formData.get("file");
  const files = multiFiles.length > 0 ? multiFiles : singleFile instanceof File && singleFile.size > 0 ? [singleFile] : [];
  if (files.length === 0) return jsonError("upload a rubric PDF or image", 400);

  try {
    const extracted = await extractQuestionAndRubricFromDocuments(
      await Promise.all(
        files.map(async (file) => ({
          bytes: Buffer.from(await file.arrayBuffer()),
          contentType: file.type || "image/png",
        }))
      ),
      { targetQuestion: question.prompt_text }
    );
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
