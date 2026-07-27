import type { CompleteOptions, CompleteResult, LLMClient } from "../types";
import { ModelCallError } from "../types";
import { throttle, withBackoff } from "../rate-limit";

// Groq free tier — OpenAI-compatible REST, no SDK. Used as the *second*,
// different-provider read in S2's dual-read (docs/DECISIONS.md "M2 —
// free-tier providers": cross-provider disagreement is stronger evidence
// than same-family disagreement). No native structured-output mode here —
// JSON-object mode + Zod validation, with the retry-once-on-failure policy
// applied by src/lib/ai/client.ts (CLAUDE.md rule 2).
const DEFAULT_MODEL = "llama-3.2-11b-vision-preview";
const DEFAULT_RPM = 25;
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function isRateLimit(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("429") || message.toLowerCase().includes("rate limit");
}

export class GroqClient implements LLMClient {
  readonly provider = "groq";
  readonly model: string;
  private apiKey: string;
  private rpm: number;

  constructor(apiKey: string, model = DEFAULT_MODEL, rpm = DEFAULT_RPM) {
    this.apiKey = apiKey;
    this.model = model;
    this.rpm = rpm;
  }

  async complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>> {
    const userContent: any[] = [{ type: "text", text: opts.prompt }];
    for (const image of opts.images ?? []) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
      });
    }

    const body = {
      model: this.model,
      temperature: opts.temperature ?? 0,
      max_tokens: opts.maxOutputTokens ?? 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${opts.system}\n\nRespond with ONLY a single JSON object matching the requested shape. No markdown fences, no commentary.`,
        },
        { role: "user", content: userContent },
      ],
    };

    const start = Date.now();
    const response = await withBackoff(
      async () => {
        await throttle("groq", this.rpm);
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Groq API ${res.status}: ${text}`);
        }
        return res.json();
      },
      isRateLimit
    );
    const latencyMs = Date.now() - start;

    const text: string | undefined = response.choices?.[0]?.message?.content;
    if (!text) {
      throw new ModelCallError("Groq response had no message content");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch (err) {
      throw new ModelCallError(`Groq returned non-JSON: ${text.slice(0, 200)}`, err);
    }

    const validated = opts.schema.safeParse(parsedJson);
    if (!validated.success) {
      throw new ModelCallError(`Groq response failed schema validation: ${validated.error.message}`);
    }

    return {
      data: validated.data,
      model: this.model,
      provider: this.provider,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs,
      costUsd: 0,
    };
  }
}
