import sharp from "sharp";
import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { sidecar } from "@/lib/sidecar/client";
import { AssessmentRubricDocumentSchema } from "@/lib/schemas/assessment-rubric-document";
import { assessmentRubricDocumentNativeSchema } from "./native-schemas";
import {
  assessmentRubricDocumentSystemPrompt,
  assessmentRubricDocumentUserPrompt,
  PROMPT_VERSIONS,
} from "./prompts";

const MAX_RUBRIC_PAGES = Number(process.env.AIMS_RUBRIC_MAX_PAGES ?? 15);
const RUBRIC_IMAGE_WIDTH = Number(process.env.AIMS_RUBRIC_IMAGE_WIDTH ?? 1200);

type DocumentInput = { bytes: Buffer; contentType: string };

async function documentImages(documents: DocumentInput[]) {
  const pageBuffers = (
    await Promise.all(
      documents.map(async (document) =>
        document.contentType === "application/pdf"
          ? (await sidecar.pdfToImages(document.bytes.toString("base64"), {
              dpi: 144,
              maxWidth: RUBRIC_IMAGE_WIDTH,
              imageFormat: "jpeg",
              quality: 76,
            })).images_b64.map((base64) => Buffer.from(base64, "base64"))
          : [document.bytes]
      )
    )
  ).flat();

  if (pageBuffers.length > MAX_RUBRIC_PAGES) {
    throw new Error(`rubric PDFs are capped at ${MAX_RUBRIC_PAGES} pages for this workflow`);
  }

  return Promise.all(
    pageBuffers.map(async (page) => ({
      mimeType: "image/jpeg" as const,
      base64: (await sharp(page)
        .rotate()
        .resize({ width: RUBRIC_IMAGE_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer()).toString("base64"),
    }))
  );
}

export async function importAssessmentRubricDocument(args: {
  assessmentId: string;
  assessmentTitle: string;
  bytes?: Buffer;
  contentType?: string;
  documents?: DocumentInput[];
}) {
  const startedAt = Date.now();
  const documents = args.documents ?? (args.bytes ? [{ bytes: args.bytes, contentType: args.contentType ?? "image/png" }] : []);
  if (documents.length === 0) throw new Error("upload a rubric PDF or image");
  const images = await documentImages(documents);
  console.log(`[rubric-import] rendered ${images.length} page(s) in ${Date.now() - startedAt}ms`);
  const extracted = await callStructured({
    stage: "assessment_rubric_document",
    promptVersion: PROMPT_VERSIONS.assessmentRubricDocument,
    role: "primary",
    system: assessmentRubricDocumentSystemPrompt(),
    prompt: assessmentRubricDocumentUserPrompt({ assessmentTitle: args.assessmentTitle, pageCount: images.length }),
    images,
    schema: AssessmentRubricDocumentSchema,
    nativeSchema: assessmentRubricDocumentNativeSchema,
    temperature: 0.1,
    maxOutputTokens: Number(process.env.AIMS_RUBRIC_IMPORT_MAX_OUTPUT_TOKENS ?? 12000),
  });
  console.log(`[rubric-import] extracted ${extracted.questions.length} question(s) in ${Date.now() - startedAt}ms`);

  const existingQuestions = (await db.listQuestionsForAssessment(args.assessmentId)) as any[];
  const byPosition = new Map(existingQuestions.map((question) => [question.position, question]));
  const imported: { questionId: string; position: number; label: string; criteriaCount: number }[] = [];

  for (const item of extracted.questions.sort((a, b) => a.position - b.position)) {
    const existing = byPosition.get(item.position);
    const question = existing
      ? await db.updateQuestion(existing.id, {
          prompt_text: item.prompt_text,
          prompt_latex: null,
          model_solution: item.model_solution,
          expected_answer_latex: item.expected_answer_latex || null,
          max_score: item.max_score,
        })
      : await db.createQuestion({
          assessment_id: args.assessmentId,
          position: item.position,
          prompt_text: item.prompt_text,
          prompt_latex: null,
          model_solution: item.model_solution,
          expected_answer_latex: item.expected_answer_latex || null,
          topic_tags: [],
          max_score: item.max_score,
        });

    const full = await db.getQuestionWithRubric((question as any).id);
    const rubric = full?.rubric ?? (await db.createRubric((question as any).id));
    await db.replaceRubricCriteria(
      (rubric as any).id,
      item.criteria.map((criterion) => ({
        key: criterion.key,
        name: criterion.name,
        weight: criterion.weight,
        max_score: criterion.max_score,
        levels: criterion.levels,
      }))
    );
    imported.push({
      questionId: (question as any).id,
      position: item.position,
      label: item.label,
      criteriaCount: item.criteria.length,
    });
  }
  console.log(`[rubric-import] persisted ${imported.length} question(s) in ${Date.now() - startedAt}ms`);

  return { imported, warnings: extracted.warnings, pageCount: images.length };
}
