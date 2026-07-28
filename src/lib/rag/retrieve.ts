import { sidecar } from "@/lib/sidecar/client";

// §12 retrieval. Was a pure keyword-overlap scorer (documented deviation —
// no embeddings model was loaded). Now uses the local bge-small-en-v1.5
// embeddings already exposed by the sidecar's /embed endpoint: chunks are
// embedded once at ingest time (scripts/ingest-corpus.ts) and stored on
// resource_chunks.embedding; retrieval embeds the query and ranks by cosine
// similarity. Falls back to keyword overlap if a chunk has no embedding
// (older corpus rows) or the sidecar/embedding call fails — degrade, never
// crash (CLAUDE.md rule 8), not a silent quality regression that goes
// unnoticed either way.

export interface ResourceChunkLike {
  resource_id: string;
  content: string;
  concepts_required: string[];
  topic_tags?: string[];
  embedding?: number[] | null;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function keywordScore(query: string, chunk: ResourceChunkLike): number {
  const queryTokens = tokenize(query);
  const chunkTokens = tokenize(`${chunk.content} ${chunk.concepts_required.join(" ")} ${(chunk.topic_tags ?? []).join(" ")}`);
  let overlap = 0;
  for (const t of queryTokens) if (chunkTokens.has(t)) overlap += 1;
  return overlap / Math.max(queryTokens.size, 1);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Synchronous keyword fallback — kept for callers that can't await (and as
 * the degrade path when embedding retrieval fails). */
export function retrieveChunksByKeyword<T extends ResourceChunkLike>(query: string, chunks: T[], k: number): T[] {
  return chunks
    .map((chunk) => ({ chunk, score: keywordScore(query, chunk) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.chunk);
}

/** Embedding-based retrieval. Embeds chunks lacking a stored vector on the
 * fly (covers corpora ingested before this existed) and ranks everything by
 * cosine similarity to the embedded query. Falls back to keyword scoring
 * entirely if the embedding call itself fails (sidecar down, model failed
 * to load) rather than throwing — practice generation should degrade, not
 * break, per CLAUDE.md rule 8. */
export async function retrieveChunks<T extends ResourceChunkLike>(query: string, chunks: T[], k: number): Promise<T[]> {
  if (chunks.length === 0) return [];

  try {
    const missingIdx = chunks.map((c, i) => (c.embedding && c.embedding.length > 0 ? -1 : i)).filter((i) => i >= 0);
    const chunkEmbeddings: (number[] | null | undefined)[] = chunks.map((c) => c.embedding);

    if (missingIdx.length > 0) {
      const missing = await sidecar.embed(missingIdx.map((i) => chunks[i].content));
      missingIdx.forEach((chunkIdx, j) => {
        chunkEmbeddings[chunkIdx] = missing.vectors[j];
      });
    }

    const [queryEmbedding] = (await sidecar.embed([query])).vectors;

    return chunks
      .map((chunk, i) => ({
        chunk,
        score: chunkEmbeddings[i] ? cosineSimilarity(queryEmbedding, chunkEmbeddings[i]!) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((s) => s.chunk);
  } catch {
    return retrieveChunksByKeyword(query, chunks, k);
  }
}
