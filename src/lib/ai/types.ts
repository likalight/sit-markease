import type { ZodType } from "zod";

// Provider-agnostic model-call interface. Every pipeline stage calls
// `complete()` — never a vendor SDK directly — so swapping providers is a
// one-line env-var change. See docs/DECISIONS.md "M2 — free-tier providers".

export interface ImageInput {
  mimeType: "image/png" | "image/jpeg";
  base64: string;
}

export interface CompleteOptions<T> {
  system: string;
  prompt: string;
  images?: ImageInput[];
  schema: ZodType<T>;
  /** Hand-written provider-native schema (e.g. Gemini responseSchema), used
   *  only by providers that support native structured output. Providers
   *  without native support fall back to prompt-and-parse + the schema
   *  above for validation. */
  nativeSchema?: unknown;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface CompleteResult<T> {
  data: T;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Always 0 on free-tier providers (docs/DECISIONS.md) — kept for schema
   *  parity with the PRD's cost_usd column and a future paid swap-in. */
  costUsd: number;
}

export interface LLMClient {
  readonly provider: string;
  readonly model: string;
  complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>>;
}

export class ModelCallError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ModelCallError";
  }
}
