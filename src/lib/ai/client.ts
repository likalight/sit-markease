import { env } from "@/lib/db/env";
import { aiCache, cacheKey, hashImage } from "./cache";
import { db } from "@/lib/db/facade";
import { ModelCallError } from "./types";
import type { CompleteOptions, ImageInput, LLMClient } from "./types";
import { GeminiClient, DEFAULT_MODEL as GEMINI_DEFAULT_MODEL } from "./providers/gemini";
import { GroqClient, DEFAULT_MODEL as GROQ_DEFAULT_MODEL } from "./providers/groq";
import { OpenAIClient, DEFAULT_MODEL as OPENAI_DEFAULT_MODEL } from "./providers/openai";
import type { ZodType } from "zod";

// The single seam every pipeline stage calls through. Provider selection is
// an env-var lookup; nothing above this file ever imports a vendor SDK.
// docs/DECISIONS.md "M2 — free-tier providers" / later entry: OpenAI added
// as the `primary` role once a real key was available, replacing Groq as
// the second dual-read vendor — Gemini now covers `fast`. Groq's client
// stays in the codebase (still usable via env var) but is no longer the
// default anywhere.

export type ModelRole = "primary" | "fast" | "adjudicator";

// Exported so anything that needs to compute a cache key exactly as the
// real pipeline would (scripts/seed-ai-fixtures.ts) reads it from here
// instead of re-hardcoding provider names — a hardcoded copy is exactly
// what silently broke the gold-script demo cache the last time the default
// providers changed (docs/DECISIONS.md).
export function providerNameForRole(role: ModelRole): string {
  const key = {
    primary: "AIMS_PROVIDER_PRIMARY",
    fast: "AIMS_PROVIDER_FAST",
    adjudicator: "AIMS_PROVIDER_ADJUDICATOR",
  }[role];
  return process.env[key] ?? (role === "fast" ? "gemini" : "openai");
}

export function defaultModelFor(providerName: string): string {
  if (providerName === "gemini") return process.env.AIMS_GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL;
  if (providerName === "groq") return process.env.AIMS_GROQ_MODEL ?? GROQ_DEFAULT_MODEL;
  if (providerName === "openai") return process.env.AIMS_OPENAI_MODEL ?? OPENAI_DEFAULT_MODEL;
  throw new ModelCallError(`unknown provider "${providerName}" — check AIMS_PROVIDER_* env vars`);
}

let cachedClients: Partial<Record<string, LLMClient>> = {};

function getClient(role: ModelRole): LLMClient {
  const providerName = providerNameForRole(role);
  if (cachedClients[providerName]) return cachedClients[providerName]!;

  let client: LLMClient;
  if (providerName === "gemini") {
    const apiKey = process.env.AIMS_GEMINI_API_KEY;
    if (!apiKey) throw new ModelCallError("AIMS_GEMINI_API_KEY is not set");
    client = new GeminiClient(apiKey, process.env.AIMS_GEMINI_MODEL, numEnv("AIMS_GEMINI_RPM", 10));
  } else if (providerName === "groq") {
    const apiKey = process.env.AIMS_GROQ_API_KEY;
    if (!apiKey) throw new ModelCallError("AIMS_GROQ_API_KEY is not set");
    client = new GroqClient(apiKey, process.env.AIMS_GROQ_MODEL, numEnv("AIMS_GROQ_RPM", 25));
  } else if (providerName === "openai") {
    const apiKey = process.env.AIMS_OPENAI_API_KEY;
    if (!apiKey) throw new ModelCallError("AIMS_OPENAI_API_KEY is not set");
    client = new OpenAIClient(apiKey, process.env.AIMS_OPENAI_MODEL, numEnv("AIMS_OPENAI_RPM", 60));
  } else {
    throw new ModelCallError(`unknown provider "${providerName}" — check AIMS_PROVIDER_* env vars`);
  }

  cachedClients[providerName] = client;
  return client;
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export interface CallStructuredArgs<T> {
  stage: string;
  promptVersion: string;
  role: ModelRole;
  system: string;
  prompt: string;
  images?: ImageInput[];
  schema: ZodType<T>;
  nativeSchema?: unknown;
  temperature?: number;
  submissionId?: string;
}

export async function callStructured<T>(args: CallStructuredArgs<T>): Promise<T> {
  // Resolve provider/model WITHOUT constructing a client — that needs an API
  // key, and a cache hit (or fixture-mode miss) must not require one.
  const providerName = providerNameForRole(args.role);
  const model = defaultModelFor(providerName);

  const imageHashes = (args.images ?? []).map((img) => hashImage(img.base64));
  const key = cacheKey({
    promptVersion: args.promptVersion,
    provider: providerName,
    model,
    system: args.system,
    prompt: args.prompt,
    imageHashes,
  });

  const cached = aiCache.get(key);
  if (cached) {
    await db.logStageRun({
      submissionId: args.submissionId,
      stage: args.stage,
      status: "succeeded",
      model: cached.model,
      promptVersion: args.promptVersion,
      inputTokens: cached.inputTokens,
      outputTokens: cached.outputTokens,
      costUsd: 0,
      latencyMs: 0,
    });
    return cached.data as T;
  }

  if (!env.isAiLive()) {
    const message = `AIMS_AI_LIVE is not set: no cached response for stage=${args.stage} promptVersion=${args.promptVersion} (key ${key.slice(0, 12)}…) — seed local-data/ai-cache, or set AIMS_AI_LIVE=true with real provider keys`;
    await db.logStageRun({
      submissionId: args.submissionId,
      stage: args.stage,
      status: "failed",
      promptVersion: args.promptVersion,
      error: message,
    });
    throw new ModelCallError(message);
  }

  const baseOpts: CompleteOptions<T> = {
    system: args.system,
    prompt: args.prompt,
    images: args.images,
    schema: args.schema,
    nativeSchema: args.nativeSchema,
    temperature: args.temperature,
  };

  try {
    const client = getClient(args.role);
    const result = await attemptWithOneRetry(client, baseOpts);
    aiCache.set(key, {
      data: result.data,
      model: result.model,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cachedAt: new Date().toISOString(),
    });
    await db.logStageRun({
      submissionId: args.submissionId,
      stage: args.stage,
      status: "succeeded",
      model: result.model,
      promptVersion: args.promptVersion,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
      latencyMs: result.latencyMs,
    });
    return result.data;
  } catch (err) {
    await db.logStageRun({
      submissionId: args.submissionId,
      stage: args.stage,
      status: "failed",
      promptVersion: args.promptVersion,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// CLAUDE.md rule 2: "On validation failure: one retry with the error
// appended, then the documented fallback." The fallback itself is the
// caller's responsibility (each stage documents what it does when this
// throws) — this function only owns the single retry.
async function attemptWithOneRetry<T>(client: LLMClient, opts: CompleteOptions<T>) {
  try {
    return await client.complete(opts);
  } catch (err) {
    if (!(err instanceof ModelCallError)) throw err;
    const retryPrompt = `${opts.prompt}\n\nYour previous response failed validation with this error:\n${err.message}\nFix the output and respond again with ONLY the corrected JSON.`;
    return client.complete({ ...opts, prompt: retryPrompt });
  }
}
