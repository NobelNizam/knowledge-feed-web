/**
 * Retriever & Context Builder
 *
 * Mencari chunk yang relevan dari vector store berdasarkan query,
 * lalu membangun context string untuk LLM prompt.
 */

import { embedText } from './embedder';
import { searchSimilar } from './vectorStore';

interface RetrieveOptions {
  topK?: number;
  maxDistance?: number;
}

interface SourceChunk {
  chunkId: string;
  content: string;
  sourceId: string;
  sourceTitle?: string;
  sourceExternalId?: string;
  sourceUrl?: string;
  sourceType?: string;
  authors?: string[];
  distance: number;
}

export async function retrieve(query: string, { topK = 5, maxDistance = 1.0 }: RetrieveOptions = {}) {
  console.log(`[Retriever] Searching for: "${query}" (topK: ${topK})`);

  const queryEmbedding = await embedText(query);
  const results = await searchSimilar(queryEmbedding, topK, maxDistance);

  if (results.length === 0) {
    console.log('[Retriever] No relevant chunks found');
    return {
      context: '',
      sourceChunks: [],
      metadata: { query, topK, resultsFound: 0 },
    };
  }

  const context = buildContext(results);
  const sourceChunks: SourceChunk[] = results.map((r: any) => ({
    chunkId: r.id,
    content: r.content,
    sourceId: r.source_id,
    sourceTitle: r.source_title,
    sourceExternalId: r.source_external_id,
    sourceUrl: r.source_url,
    sourceType: r.source_type,
    authors: r.authors,
    distance: parseFloat(r.distance),
  }));

  console.log(`[Retriever] Retrieved ${results.length} chunks from ${new Set(results.map((r: any) => r.source_id)).size} sources`);

  return {
    context,
    sourceChunks,
    metadata: {
      query,
      topK,
      resultsFound: results.length,
      avgDistance: sourceChunks.reduce((sum, c) => sum + c.distance, 0) / sourceChunks.length,
    },
  };
}

export function buildContext(chunks: any[]): string {
  if (!chunks || chunks.length === 0) return '';

  const contextParts = chunks.map((chunk, index) => {
    const sourceInfo = chunk.source_title
      ? `[Source ${index + 1}: "${chunk.source_title}"${chunk.source_external_id ? ` (${chunk.source_external_id})` : ''}]`
      : `[Source ${index + 1}]`;

    return `${sourceInfo}\n${chunk.content}`;
  });

  return contextParts.join('\n\n---\n\n');
}

export function buildCitations(sourceChunks: SourceChunk[]) {
  const seen = new Set();
  const citations: any[] = [];

  for (const chunk of sourceChunks) {
    if (seen.has(chunk.sourceId)) continue;
    seen.add(chunk.sourceId);

    citations.push({
      title: chunk.sourceTitle || 'Unknown',
      url: chunk.sourceUrl || '',
      externalId: chunk.sourceExternalId || '',
      sourceType: chunk.sourceType || 'unknown',
      authors: chunk.authors || [],
    });
  }

  return citations;
}

export async function retrieveMultiple(queries: string[], options: RetrieveOptions = {}) {
  const allChunks: SourceChunk[] = [];
  const allContexts: string[] = [];

  for (const query of queries) {
    const result = await retrieve(query, options);
    if (result.context) {
      allContexts.push(result.context);
      allChunks.push(...result.sourceChunks);
    }
  }

  const seenChunkIds = new Set();
  const uniqueChunks = allChunks.filter((c) => {
    if (seenChunkIds.has(c.chunkId)) return false;
    seenChunkIds.add(c.chunkId);
    return true;
  });

  return {
    context: allContexts.join('\n\n===\n\n'),
    sourceChunks: uniqueChunks,
    metadata: {
      queries,
      totalChunks: uniqueChunks.length,
      totalSources: new Set(uniqueChunks.map((c) => c.sourceId)).size,
    },
  };
}
