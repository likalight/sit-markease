import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { extractQuestionAndRubricFromDocuments } from "@/lib/pipeline/document-extract";

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
  const multiFiles = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  const singleFile = formData.get("file");
  const files = multiFiles.length > 0 ? multiFiles : singleFile instanceof File && singleFile.size > 0 ? [singleFile] : [];
  if (files.length === 0) {
    return NextResponse.json({ error: { code: "MISSING_FILE", message: "no file uploaded" } }, { status: 400 });
  }

  try {
    const extracted = await extractQuestionAndRubricFromDocuments(
      await Promise.all(
        files.map(async (file) => ({
          bytes: Buffer.from(await file.arrayBuffer()),
          contentType: file.type || "image/png",
        }))
      )
    );
    return NextResponse.json(extracted);
  } catch (err) {
    return NextResponse.json(
      { error: { code: "EXTRACTION_FAILED", message: err instanceof Error ? err.message : String(err) } },
      { status: 502 }
    );
  }
}
