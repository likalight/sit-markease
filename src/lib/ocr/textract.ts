import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

// AWS Textract — a second, independent OCR opinion alongside pix2text at S2
// (see docs/DECISIONS.md). Unlike the LLM providers in src/lib/ai/, this
// uses the official AWS SDK rather than raw fetch: Textract's auth is
// SigV4-signed requests, not a bearer token, and hand-rolling SigV4 signing
// would be a much bigger, more error-prone undertaking than the "no vendor
// SDK" convention was ever meant to avoid.

export interface TextractLine {
  text: string;
  confidence: number;
}

let client: TextractClient | null = null;

function getClient(): TextractClient {
  if (!client) {
    client = new TextractClient({
      region: required("AIMS_AWS_REGION"),
      credentials: {
        accessKeyId: required("AIMS_AWS_ACCESS_KEY_ID"),
        secretAccessKey: required("AIMS_AWS_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function isConfigured(): boolean {
  return Boolean(process.env.AIMS_AWS_ACCESS_KEY_ID && process.env.AIMS_AWS_SECRET_ACCESS_KEY && process.env.AIMS_AWS_REGION);
}

/** DetectDocumentText handles both printed and handwritten text — no need
 * for the heavier AnalyzeDocument (forms/tables) mode, since this is a
 * worked-math script, not a structured form. Returns LINE blocks in the
 * reading order Textract itself detected (top-to-bottom), Confidence
 * normalised from Textract's 0-100 scale to 0-1 to match pix2text's scale. */
export async function detectText(imageBase64: string): Promise<TextractLine[]> {
  const bytes = Buffer.from(imageBase64, "base64");
  const command = new DetectDocumentTextCommand({ Document: { Bytes: bytes } });
  const response = await getClient().send(command);

  return (response.Blocks ?? [])
    .filter((block) => block.BlockType === "LINE" && block.Text)
    .map((block) => ({
      text: block.Text ?? "",
      confidence: (block.Confidence ?? 0) / 100,
    }));
}
