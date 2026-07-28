import { NextRequest, NextResponse } from "next/server";
import { localFiles } from "@/lib/storage/local-files";

// Serves files written by src/lib/storage/local-files.ts — the fixture-mode
// stand-in for Supabase Storage's public/signed URLs (docs/DECISIONS.md M2).
// Deliberately unauthenticated: the public landing page embeds a live
// annotated-script image for anonymous judges (CLAUDE.md — "do not remove
// the source-image-beside-transcription view"), same threat model as a
// public Supabase Storage bucket. Path traversal is the real bug this route
// had (segments joined straight into a filesystem path); that's fixed in
// localFiles.read(), not here.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");
  try {
    const bytes = localFiles.read(relativePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
