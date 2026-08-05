import { callStructured } from "@/lib/ai/client";
import { sidecar } from "@/lib/sidecar/client";
import { detectText, isConfigured as isTextractConfigured } from "@/lib/ocr/textract";
import { DocumentExtractSchema, type DocumentExtract } from "@/lib/schemas/document-extract";
import { documentExtractNativeSchema } from "./native-schemas";
import {
  documentExtractSystemPrompt,
  documentExtractUserPrompt,
  pix2textHintSource,
  textractHintSource,
  renderOcrHints,
  type OcrHintSource,
  PROMPT_VERSIONS,
} from "./prompts";

const MAX_RUBRIC_PAGES = Number(process.env.AIMS_RUBRIC_MAX_PAGES ?? 15);
type DocumentInput = { bytes: Buffer; contentType: string };

// Lets an educator upload a real marking-scheme/rubric document (photo or
// PDF) instead of retyping it, prefilling the same fields the "New
// question" form already asks for. Mirrors S2's OCR-hint pattern (pix2text
// + Textract feeding one vision call) but deliberately does NOT reuse
// s1-ingest.ts's ingestSubmission() — that function is tightly coupled to
// "grading a student attempt" (unconditionally creates a submissions row),
// which doesn't fit a reference-document upload. Only reads the first
// page of a multi-page document — same documented scope cut as the rest of
// the pipeline.

async function gatherHintSources(imageBase64: string): Promise<OcrHintSource[]> {
  const [pix2textResult, textractResult] = await Promise.allSettled([
    sidecar.ocrTranscribe(imageBase64),
    isTextractConfigured() ? detectText(imageBase64) : Promise.reject(new Error("Textract not configured")),
  ]);

  const sources: OcrHintSource[] = [];
  if (pix2textResult.status === "fulfilled" && pix2textResult.value.items.length > 0) {
    sources.push(pix2textHintSource(pix2textResult.value.items));
  }
  if (textractResult.status === "fulfilled" && textractResult.value.length > 0) {
    sources.push(textractHintSource(textractResult.value));
  }
  return sources;
}

export async function extractQuestionAndRubric(
  bytes: Buffer,
  contentType: string,
  options?: { targetQuestion?: string }
): Promise<DocumentExtract> {
  return extractQuestionAndRubricFromDocuments([{ bytes, contentType }], options);
}

export async function extractQuestionAndRubricFromDocuments(
  documents: DocumentInput[],
  options?: { targetQuestion?: string }
): Promise<DocumentExtract> {
  let images: { mimeType: "image/png" | "image/jpeg"; base64: string }[];

  const rendered = (
    await Promise.all(
      documents.map(async ({ bytes, contentType }) => {
        if (contentType === "application/pdf") {
          const converted = await sidecar.pdfToImages(bytes.toString("base64"), {
            dpi: 144,
            maxWidth: 1200,
            imageFormat: "jpeg",
            quality: 76,
          });
          if (converted.images_b64.length === 0) throw new Error("PDF had no pages");
          return converted.images_b64.map((base64) => ({ mimeType: "image/jpeg" as const, base64 }));
        }
        return [
          {
            mimeType: contentType === "image/jpeg" ? ("image/jpeg" as const) : ("image/png" as const),
            base64: bytes.toString("base64"),
          },
        ];
      })
    )
  ).flat();

  if (rendered.length > MAX_RUBRIC_PAGES) {
    throw new Error(`rubric PDFs are capped at ${MAX_RUBRIC_PAGES} pages for this workflow`);
  }
  images = rendered;

  const sources = await gatherHintSources(images[0].base64);
  const ocrHint = sources.length > 0 ? renderOcrHints(sources) : undefined;

  return callStructured({
    stage: "document_extract",
    promptVersion: PROMPT_VERSIONS.documentExtract,
    role: "primary",
    system: documentExtractSystemPrompt(),
    prompt: documentExtractUserPrompt(ocrHint, options?.targetQuestion),
    images,
    schema: DocumentExtractSchema,
    nativeSchema: documentExtractNativeSchema,
    temperature: 0.1,
  });
}
