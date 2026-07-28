import { z } from "zod";

export const EquivalentResponseSchema = z.object({
  equivalent: z.boolean().nullable(),
  parsed: z.boolean(),
});
export type EquivalentResponse = z.infer<typeof EquivalentResponseSchema>;

export const VerifyItemResponseSchema = z.object({
  valid: z.boolean(),
  reason: z.string(),
  // "unparseable" is a real, intentional sidecar/symbolic.py return value —
  // it means "not a recognised dy/dx=.../y=... pair," which the caller
  // (verifyGeneratedItem in s7-practice.ts) is specifically written to
  // catch and fall back to LLM judgement for. Missing it here meant every
  // real (non-fixture-cached) call to /math/verify-item on a genuinely
  // unparseable item threw a schema validation error instead of falling
  // back — never caught before because fixture mode never called this
  // live until now.
  method: z.enum(["sympy", "llm", "unverified", "unparseable"]),
});
export type VerifyItemResponse = z.infer<typeof VerifyItemResponseSchema>;
