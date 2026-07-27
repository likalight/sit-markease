import { z } from "zod";

export const EquivalentResponseSchema = z.object({
  equivalent: z.boolean().nullable(),
  parsed: z.boolean(),
});
export type EquivalentResponse = z.infer<typeof EquivalentResponseSchema>;

export const VerifyItemResponseSchema = z.object({
  valid: z.boolean(),
  reason: z.string(),
  method: z.enum(["sympy", "llm", "unverified"]),
});
export type VerifyItemResponse = z.infer<typeof VerifyItemResponseSchema>;
