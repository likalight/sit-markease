import { env } from "@/lib/db/env";
import {
  DetectLinesResponseSchema,
  PreprocessResponseSchema,
  PdfToImagesResponseSchema,
  type DetectLinesResponse,
  type PreprocessResponse,
  type PdfToImagesResponse,
} from "@/lib/schemas/geometry";
import { EmbedResponseSchema, type EmbedResponse } from "@/lib/schemas/embedding";
import {
  EquivalentResponseSchema,
  VerifyItemResponseSchema,
  type EquivalentResponse,
  type VerifyItemResponse,
} from "@/lib/schemas/symbolic";
import { OcrTranscribeResponseSchema, type OcrTranscribeResponse } from "@/lib/schemas/ocr";

async function postJson<T>(path: string, body: unknown, schema: { parse(v: unknown): T }): Promise<T> {
  const res = await fetch(`${env.sidecarUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Sidecar ${path} failed: ${res.status} ${await res.text()}`);
  }
  return schema.parse(await res.json());
}

export type PdfToImagesOptions = {
  dpi?: number;
  maxWidth?: number;
  imageFormat?: "png" | "jpeg";
  quality?: number;
};

export const sidecar = {
  health(): Promise<{ ok: boolean; models_loaded: Record<string, boolean> }> {
    return fetch(`${env.sidecarUrl()}/health`).then((r) => r.json());
  },

  preprocess(imageB64: string): Promise<PreprocessResponse> {
    return postJson("/cv/preprocess", { image_b64: imageB64 }, PreprocessResponseSchema);
  },

  detectLines(imageB64: string): Promise<DetectLinesResponse> {
    return postJson("/cv/detect-lines", { image_b64: imageB64 }, DetectLinesResponseSchema);
  },

  pdfToImages(pdfB64: string, options: PdfToImagesOptions = {}): Promise<PdfToImagesResponse> {
    return postJson(
      "/pdf/to-images",
      {
        pdf_b64: pdfB64,
        dpi: options.dpi,
        max_width: options.maxWidth,
        image_format: options.imageFormat,
        quality: options.quality,
      },
      PdfToImagesResponseSchema
    );
  },

  embed(texts: string[]): Promise<EmbedResponse> {
    return postJson("/embed", { texts }, EmbedResponseSchema);
  },

  mathEquivalent(aLatex: string, bLatex: string): Promise<EquivalentResponse> {
    return postJson("/math/equivalent", { a_latex: aLatex, b_latex: bLatex }, EquivalentResponseSchema);
  },

  verifyItem(prompt: string, solution: string): Promise<VerifyItemResponse> {
    return postJson("/math/verify-item", { prompt, solution }, VerifyItemResponseSchema);
  },

  ocrTranscribe(imageB64: string): Promise<OcrTranscribeResponse> {
    return postJson("/ocr/transcribe", { image_b64: imageB64 }, OcrTranscribeResponseSchema);
  },
};
