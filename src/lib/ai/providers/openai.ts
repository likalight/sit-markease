import type { CompleteOptions, CompleteResult, LLMClient } from "../types";
import { ModelCallError } from "../types";
import { throttle, withBackoff } from "../rate-limit";

// OpenAI — the second independent vision-capable read, replacing Groq
// (docs/DECISIONS.md: Groq's vision quality on handwriting was never proven
// out; OpenAI + Gemini are two genuinely capable, differently-trained
// vision models, so agreement between them is a real trust signal rather
// than "the weak one got it wrong again"). Raw fetch, no `openai` npm
// package — matches this codebase's existing Groq provider style and adds
// zero new dependencies.
//
// Uses JSON-object mode + Zod validation, not OpenAI's strict json_schema
// mode: the native-schema literals already in this repo (native-schemas.ts)
// are hand-written in Gemini's SchemaType/OpenAPI-subset shape, not
// standard JSON Schema, so they don't transfer to OpenAI's response_format
// as-is. Upgrading specific high-value stages to a hand-written OpenAI
// json_schema is a smaller follow-up, not required for this to work.
export const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_RPM = 60;
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

function isRateLimit(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("429") || message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("quota");
}

export class OpenAIClient implements LLMClient {
  readonly provider = "openai";
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
        await throttle("openai", this.rpm);
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
          throw new Error(`OpenAI API ${res.status}: ${text}`);
        }
        return res.json();
      },
      isRateLimit
    );
    const latencyMs = Date.now() - start;

    const text: string | undefined = response.choices?.[0]?.message?.content;
    if (!text) {
      throw new ModelCallError("OpenAI response had no message content");
    }

    const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripped);
    } catch (err) {
      throw new ModelCallError(`OpenAI returned non-JSON: ${text.slice(0, 200)}`, err);
    }

    const validated = opts.schema.safeParse(parsedJson);
    if (!validated.success) {
      throw new ModelCallError(`OpenAI response failed schema validation: ${validated.error.message}`);
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
