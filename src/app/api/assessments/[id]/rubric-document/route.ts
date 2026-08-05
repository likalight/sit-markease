import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { importAssessmentRubricDocument } from "@/lib/pipeline/assessment-rubric-import";

export const maxDuration = 300;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") return jsonError("educator role required", 403);

  const { id: assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) return jsonError("assessment not found", 404);

  const formData = await request.formData();
  const multiFiles = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  const singleFile = formData.get("file");
  const files = multiFiles.length > 0 ? multiFiles : singleFile instanceof File && singleFile.size > 0 ? [singleFile] : [];
  if (files.length === 0) return jsonError("upload a rubric PDF or image", 400);

  try {
    const result = await importAssessmentRubricDocument({
      assessmentId,
      assessmentTitle: (assessment as any).title ?? "Assessment",
      documents: await Promise.all(
        files.map(async (file) => ({
          bytes: Buffer.from(await file.arrayBuffer()),
          contentType: file.type || "image/png",
        }))
      ),
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 502);
  }
}
