import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { materializeMappedSubmissions } from "@/lib/pipeline/script-ingest";

export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") return NextResponse.json({ error: { message: "educator role required" } }, { status: 403 });
  const { id } = await params;
  const script = await db.getScriptUpload(id);
  if (!script) return NextResponse.json({ error: { message: "script not found" } }, { status: 404 });
  try {
    const submissions = await materializeMappedSubmissions(id);
    return NextResponse.json({ submissionIds: (submissions as any[]).map((submission) => submission.id) });
  } catch (error) {
    await db.updateScriptUpload(id, { status: "failed" });
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : String(error) } }, { status: 500 });
  }
}
