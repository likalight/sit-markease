import sharp from "sharp";
import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { sidecar } from "@/lib/sidecar/client";
import { ScriptMappingSchema, type PageRegion } from "@/lib/schemas/script-mapping";
import { scriptMappingNativeSchema } from "./native-schemas";
import { PROMPT_VERSIONS, scriptMappingSystemPrompt, scriptMappingUserPrompt } from "./prompts";
import { ingestSubmission } from "./s1-ingest";

const AUTO_MAPPING_THRESHOLD = Number(process.env.AIMS_MAPPING_CONFIDENCE_THRESHOLD ?? 0.8);
const PREPROCESS_SCRIPT_PAGES = process.env.AIMS_SCRIPT_PREPROCESS === "true";
const MAPPING_IMAGE_WIDTH = Number(process.env.AIMS_MAPPING_IMAGE_WIDTH ?? 1600);
const MAX_SCRIPT_PAGES = Number(process.env.AIMS_SCRIPT_MAX_PAGES ?? 15);

type DocumentPage = {
  bytes: Buffer;
  contentType: "image/png" | "image/jpeg";
};

async function documentPages(bytes: Buffer, contentType: string): Promise<DocumentPage[]> {
  if (contentType === "application/pdf") {
    throw new Error("PDF reached script processing without browser rendering. Hard refresh this page, then choose the PDF again or use compressed page images.");
  }
  return [{ bytes: await sharp(bytes).png().toBuffer(), contentType: "image/png" }];
}

async function prepareScriptPage(original: Buffer) {
  if (PREPROCESS_SCRIPT_PAGES) {
    const preprocessed = await sidecar.preprocess(original.toString("base64"));
    return {
      bytes: Buffer.from(preprocessed.processed_b64, "base64"),
      qualityScore: preprocessed.quality_score,
    };
  }

  const bytes = await sharp(original)
    .rotate()
    .resize({ width: MAPPING_IMAGE_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();
  return { bytes, qualityScore: null };
}

export async function ingestAssessmentScript(args: {
  assessmentId: string;
  studentId: string;
  attemptId?: string | null;
  uploadedBy: string;
  uploadKind: "formative" | "summative";
  documents: { bytes: Buffer; contentType: string }[];
}) {
  const questions = (await db.listQuestionsForAssessment(args.assessmentId)) as any[];
  if (questions.length === 0) throw new Error("assessment has no questions");
  const questionsWithRubrics = await Promise.all(
    questions.map(async (question) => {
      const full = await db.getQuestionWithRubric(question.id);
      return {
        ...question,
        criteria: (full?.criteria ?? []).map((criterion: any) => ({
          name: criterion.name,
          max_score: criterion.max_score,
        })),
      };
    })
  );

  const script = await db.createScriptUpload({
    assessment_id: args.assessmentId,
    student_id: args.studentId,
    attempt_id: args.attemptId ?? null,
    uploaded_by: args.uploadedBy,
    upload_kind: args.uploadKind,
    status: "mapping",
  });

  try {
    const pages = (await Promise.all(args.documents.map((document) => documentPages(document.bytes, document.contentType)))).flat();
    if (pages.length > MAX_SCRIPT_PAGES) {
      throw new Error(`script uploads are capped at ${MAX_SCRIPT_PAGES} pages for this workflow`);
    }
    const images: { mimeType: "image/png"; base64: string }[] = [];

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const original = pages[pageIndex];
      const processedPage = await prepareScriptPage(original.bytes);
      const processed = processedPage.bytes;
      const metadata = await sharp(processed).metadata();
      const originalPath = `scripts/${script.id}/original-${pageIndex}.${original.contentType === "image/jpeg" ? "jpg" : "png"}`;
      const processedPath = `scripts/${script.id}/processed-${pageIndex}.png`;
      await db.uploadImage(originalPath, original.bytes, original.contentType);
      await db.uploadImage(processedPath, processed, "image/png");
      await db.createScriptPage({
        script_upload_id: script.id,
        page_index: pageIndex,
        storage_path: originalPath,
        processed_path: processedPath,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        quality_score: processedPage.qualityScore,
      });
      images.push({ mimeType: "image/png", base64: processed.toString("base64") });
    }

    const result = await callStructured({
      stage: "S1c_question_map",
      promptVersion: PROMPT_VERSIONS.scriptMapping,
      role: "primary",
      system: scriptMappingSystemPrompt(),
      prompt: scriptMappingUserPrompt(questionsWithRubrics, images.length),
      images,
      schema: ScriptMappingSchema,
      nativeSchema: scriptMappingNativeSchema,
      temperature: 0,
    });

    const questionIds = new Set(questions.map((q) => q.id));
    const seen = new Set<string>();
    const mappings = result.mappings.filter((mapping) => {
      if (!questionIds.has(mapping.question_id) || seen.has(mapping.question_id)) return false;
      if (mapping.regions.some((region) => region.page_index >= images.length)) return false;
      seen.add(mapping.question_id);
      return true;
    });

    await db.replaceQuestionMappings(
      script.id,
      mappings.map((mapping) => ({
        script_upload_id: script.id,
        question_id: mapping.question_id,
        detected_label: mapping.detected_label,
        regions: mapping.regions,
        confidence: mapping.confidence,
        notes: mapping.notes,
        status: "suggested",
      }))
    );

    const confident =
      mappings.length === questions.length &&
      result.unassigned_regions.length === 0 &&
      mappings.every((mapping) => mapping.confidence >= AUTO_MAPPING_THRESHOLD);
    await db.updateScriptUpload(script.id, { status: confident ? "mapped" : "needs_mapping_review" });
    return { scriptUploadId: script.id, pageCount: images.length, mappings, confident, flags: result.flags };
  } catch (error) {
    await db.updateScriptUpload(script.id, { status: "failed" });
    throw error;
  }
}

async function cropQuestion(regions: PageRegion[], pagesByIndex: Map<number, any>) {
  const crops: { input: Buffer; width: number; height: number }[] = [];
  for (const region of regions) {
    const page = pagesByIndex.get(region.page_index);
    if (!page) continue;
    const source = await db.downloadImage(page.processed_path);
    const metadata = await sharp(source).metadata();
    const pageWidth = metadata.width ?? page.width;
    const pageHeight = metadata.height ?? page.height;
    if (!pageWidth || !pageHeight) continue;
    const left = Math.max(0, Math.min(pageWidth - 1, Math.floor(region.x * pageWidth)));
    const top = Math.max(0, Math.min(pageHeight - 1, Math.floor(region.y * pageHeight)));
    const width = Math.max(1, Math.min(pageWidth - left, Math.ceil(region.w * pageWidth)));
    const height = Math.max(1, Math.min(pageHeight - top, Math.ceil(region.h * pageHeight)));
    const input = await sharp(source).extract({ left, top, width, height }).png().toBuffer();
    crops.push({ input, width, height });
  }
  if (crops.length === 0) throw new Error("mapping has no usable image regions");
  if (crops.length === 1) return crops[0].input;

  const gap = 24;
  const width = Math.max(...crops.map((crop) => crop.width));
  const height = crops.reduce((sum, crop) => sum + crop.height, 0) + gap * (crops.length - 1);
  let top = 0;
  const composite = crops.map((crop) => {
    const item = { input: crop.input, left: 0, top };
    top += crop.height + gap;
    return item;
  });
  return sharp({ create: { width, height, channels: 3, background: "white" } }).composite(composite).png().toBuffer();
}

export async function materializeMappedSubmissions(scriptUploadId: string) {
  const script = await db.getScriptUpload(scriptUploadId);
  if (!script) throw new Error("script upload not found");
  const existing = await db.listSubmissionsForScript(scriptUploadId);
  if (existing.length > 0) return existing;

  const pages = await db.listScriptPages(scriptUploadId);
  const pagesByIndex = new Map((pages as any[]).map((page) => [page.page_index, page]));
  const mappings = (await db.listQuestionMappings(scriptUploadId)) as any[];
  const submissions: any[] = [];

  await db.updateScriptUpload(scriptUploadId, { status: "processing" });
  for (const mapping of mappings.filter((item) => item.status !== "rejected")) {
    const crop = await cropQuestion(mapping.regions as PageRegion[], pagesByIndex);
    const ingested = await ingestSubmission(mapping.question_id, crop, "image/png", script.student_id, {
      attemptId: script.attempt_id,
      scriptUploadId,
    });
    if ("error" in ingested) throw new Error(ingested.error);
    await db.updateQuestionMapping(mapping.id, { status: "confirmed", submission_id: ingested.submissionId });
    submissions.push(await db.getSubmission(ingested.submissionId));
  }
  await db.updateScriptUpload(scriptUploadId, { status: "mapped" });
  return submissions;
}
