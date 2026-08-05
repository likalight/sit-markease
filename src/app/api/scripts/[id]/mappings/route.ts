import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { PageRegionSchema } from "@/lib/schemas/script-mapping";

const PayloadSchema = z.object({
  mappings: z.array(z.object({
    questionId: z.string().uuid(),
    detectedLabel: z.string(),
    regions: z.array(PageRegionSchema).min(1),
    confidence: z.number().min(0).max(1),
    notes: z.string(),
  })),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") return NextResponse.json({ error: { message: "educator role required" } }, { status: 403 });
  const { id } = await params;
  const script = await db.getScriptUpload(id);
  if (!script) return NextResponse.json({ error: { message: "script not found" } }, { status: 404 });
  const parsed = PayloadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: { message: parsed.error.issues[0]?.message ?? "invalid mapping" } }, { status: 400 });
  const questions = await db.listQuestionsForAssessment((script as any).assessment_id);
  const allowed = new Set((questions as any[]).map((question) => question.id));
  const seen = new Set<string>();
  if (parsed.data.mappings.some((mapping) => !allowed.has(mapping.questionId) || seen.has(mapping.questionId) || !seen.add(mapping.questionId))) {
    return NextResponse.json({ error: { message: "each mapping must use one unique question from this assessment" } }, { status: 400 });
  }
  const rows = await db.replaceQuestionMappings(id, parsed.data.mappings.map((mapping) => ({
    script_upload_id: id,
    question_id: mapping.questionId,
    detected_label: mapping.detectedLabel,
    regions: mapping.regions,
    confidence: mapping.confidence,
    notes: mapping.notes,
    status: "suggested",
  })));
  await db.updateScriptUpload(id, { status: "needs_mapping_review" });
  return NextResponse.json({ mappings: rows });
}
