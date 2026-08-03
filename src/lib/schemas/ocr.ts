import { z } from "zod";

// pix2text's per-region OCR output — a pre-transcription hint for S2, not a
// replacement for it. `position` is pix2text's raw quadrilateral (4 [x,y]
// point pairs in image pixel space), kept as-is rather than normalised since
// it's only ever rendered into a prompt, never used for geometry math.
export const OcrItemSchema = z.object({
  type: z.string(),
  text: z.string(),
  score: z.number(),
  position: z.array(z.array(z.number())),
  line_number: z.number().int(),
});
export type OcrItem = z.infer<typeof OcrItemSchema>;

export const OcrTranscribeResponseSchema = z.object({
  items: z.array(OcrItemSchema),
  source: z.literal("pix2text"),
});
export type OcrTranscribeResponse = z.infer<typeof OcrTranscribeResponseSchema>;
