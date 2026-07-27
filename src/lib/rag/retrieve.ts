// §12 retrieval. Deviation (docs/DECISIONS.md): AIMS_RETRIEVAL_MODE=fulltext
// — no embeddings model is loaded (sentence-transformers is a heavy,
// timeboxed install per CLAUDE.md, and a 3-chunk hand-authored corpus gets
// no benefit from it). This is a plain keyword-overlap scorer standing in
// for the PRD's Postgres tsvector fulltext fallback, which the PRD itself
// says is "honestly competitive" on a small corpus.

export interface ResourceChunkLike {
  resource_id: string;
  content: string;
  concepts_required: string[];
  topic_tags?: string[];
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

export function retrieveChunks<T extends ResourceChunkLike>(query: string, chunks: T[], k: number): T[] {
  const queryTokens = tokenize(query);
  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(`${chunk.content} ${chunk.concepts_required.join(" ")} ${(chunk.topic_tags ?? []).join(" ")}`);
    let overlap = 0;
    for (const t of queryTokens) if (chunkTokens.has(t)) overlap += 1;
    return { chunk, score: overlap / Math.max(queryTokens.size, 1) };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.chunk);
}
