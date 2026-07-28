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

  pdfToImages(pdfB64: string): Promise<PdfToImagesResponse> {
    return postJson("/pdf/to-images", { pdf_b64: pdfB64 }, PdfToImagesResponseSchema);
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
};
