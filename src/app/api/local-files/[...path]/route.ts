import { NextRequest, NextResponse } from "next/server";
import { localFiles } from "@/lib/storage/local-files";

// Serves files written by src/lib/storage/local-files.ts — the fixture-mode
// stand-in for Supabase Storage's public/signed URLs (docs/DECISIONS.md M2).
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
