import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { extractQuestionAndRubric } from "@/lib/pipeline/document-extract";

// Real vision AI calls, image preprocessing on the sidecar side — same
// ballpark latency as a student submission's transcription stage, not an
// instant form post.
export const maxDuration = 60;

// POST /api/assignments/extract-document — educator uploads a photo/PDF of
// a real marking-scheme/rubric document; returns extracted fields to
// prefill the "New question" form (src/app/(educator)/assignments/new).
// Nothing is persisted here — the educator still reviews/edits and submits
// the existing form themselves.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "educator role required" } }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "MISSING_FILE", message: "no file uploaded" } }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const extracted = await extractQuestionAndRubric(bytes, file.type || "image/png");
    return NextResponse.json(extracted);
  } catch (err) {
    return NextResponse.json(
      { error: { code: "EXTRACTION_FAILED", message: err instanceof Error ? err.message : String(err) } },
      { status: 502 }
    );
  }
}
