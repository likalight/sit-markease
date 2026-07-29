"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { sidecar } from "@/lib/sidecar/client";

// Lets an educator feed reference material (lecture notes, worked examples)
// into the RAG corpus for their questions' practice generation. Without
// this, every question created outside the one originally-seeded module
// had nothing for S7 to retrieve from — practice items would generate
// ungrounded, quietly undermining the brief's "targeted practice via RAG"
// claim for any newly authored subject (docs/DECISIONS.md).
export async function addResourceAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") {
    redirect("/login");
  }

  const label = String(formData.get("label") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const topicTagsRaw = String(formData.get("topicTags") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "scaffold");

  if (!label || !content) {
    redirect(`/assignments/resources?error=${encodeURIComponent("fill in a label and the reference content")}`);
  }

  const topicTags = topicTagsRaw ? topicTagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  // Split into paragraph-level chunks for finer-grained retrieval, same
  // shape as scripts/ingest-corpus.ts's hand-authored corpus.
  const chunks = content
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  let embeddings: number[][] | null = null;
  try {
    const result = await sidecar.embed(chunks);
    embeddings = result.vectors;
  } catch {
    // Degrade, don't block ingestion — src/lib/rag/retrieve.ts falls back
    // to keyword scoring for chunks with no stored embedding.
  }

  const module_ = await db.findOrCreateDefaultModule(user!.id);
  const resource = await db.insertResource({
    module_id: (module_ as any).id,
    kind: "lecture_notes",
    label,
    storage_path: null,
    topic_tags: topicTags,
    difficulty,
  });

  await db.insertResourceChunks(
    chunks.map((chunkContent, i) => ({
      resource_id: (resource as any).id,
      chunk_index: i,
      content: chunkContent,
      concepts_required: topicTags,
      embedding: embeddings ? embeddings[i] : null,
    }))
  );

  redirect("/assignments/resources");
}
