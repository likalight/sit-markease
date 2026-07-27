import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CompleteOptions, CompleteResult, LLMClient } from "../types";
import { ModelCallError } from "../types";
import { throttle, withBackoff } from "../rate-limit";

// Google AI Studio (Gemini) — free tier. Vision-capable Flash model, native
// structured output via responseSchema (no prompt-and-parse for this
// provider — docs/DECISIONS.md "M2 — free-tier providers").
export const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_RPM = 10; // AI Studio free tier is stingy; keep this conservative and env-overridable.

function isRateLimit(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("429") || message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("quota");
}

export class GeminiClient implements LLMClient {
  readonly provider = "gemini";
  readonly model: string;
  private client: GoogleGenerativeAI;
  private rpm: number;

  constructor(apiKey: string, model = DEFAULT_MODEL, rpm = DEFAULT_RPM) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
    this.rpm = rpm;
  }

  async complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>> {
    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: opts.system,
      generationConfig: {
        temperature: opts.temperature ?? 0,
        maxOutputTokens: opts.maxOutputTokens ?? 4096,
        ...(opts.nativeSchema
          ? { responseMimeType: "application/json", responseSchema: opts.nativeSchema as object }
          : {}),
      },
    });

    const parts: any[] = [{ text: opts.prompt }];
    for (const image of opts.images ?? []) {
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
    }

    const start = Date.now();
    const result = await withBackoff(
      async () => {
        await throttle("gemini", this.rpm);
        return generativeModel.generateContent(parts);
      },
      isRateLimit
    );
    const latencyMs = Date.now() - start;

    const text = result.response.text();
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch (err) {
      throw new ModelCallError(`Gemini returned non-JSON despite responseSchema: ${text.slice(0, 200)}`, err);
    }

    const validated = opts.schema.safeParse(parsedJson);
    if (!validated.success) {
      throw new ModelCallError(`Gemini response failed schema validation: ${validated.error.message}`);
    }

    const usage = result.response.usageMetadata;
    return {
      data: validated.data,
      model: this.model,
      provider: this.provider,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      latencyMs,
      costUsd: 0,
    };
  }
}
