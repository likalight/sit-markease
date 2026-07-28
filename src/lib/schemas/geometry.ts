import { z } from "zod";

// Normalised (0..1) bounding box, per §7.2 / the `detected_lines.box` jsonb column.
export const BoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});
export type Box = z.infer<typeof BoxSchema>;

export const PreprocessResponseSchema = z.object({
  processed_b64: z.string(),
  skew_deg: z.number(),
  quality_score: z.number(),
});
export type PreprocessResponse = z.infer<typeof PreprocessResponseSchema>;

export const DetectLinesResponseSchema = z.object({
  boxes: z.array(BoxSchema),
  source: z.enum(["opencv", "paddle", "commercial"]),
});
export type DetectLinesResponse = z.infer<typeof DetectLinesResponseSchema>;

export const PdfToImagesResponseSchema = z.object({
  images_b64: z.array(z.string()),
  page_count: z.number(),
});
export type PdfToImagesResponse = z.infer<typeof PdfToImagesResponseSchema>;
