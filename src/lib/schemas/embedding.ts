import { z } from "zod";

export const EmbedResponseSchema = z.object({
  vectors: z.array(z.array(z.number())),
  dim: z.number(),
});
export type EmbedResponse = z.infer<typeof EmbedResponseSchema>;
