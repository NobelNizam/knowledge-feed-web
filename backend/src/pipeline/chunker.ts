/**
 * Chunker — Document Chunking
 *
 * Memecah dokumen menjadi chunk kecil dengan overlap
 * untuk diproses embedding dan retrieval.
 */

const DEFAULT_CHUNK_SIZE = parseInt(process.env.PIPELINE_CHUNK_SIZE || '500', 10);
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.PIPELINE_CHUNK_OVERLAP || '50', 10);

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1|SPLIT|')
    .replace(/\n\n/g, '|SPLIT|')
    .split('|SPLIT|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface Chunk {
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  tokenCount: number;
  sourceId?: string;
}

interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export function chunkDocument(
  text: string,
  { chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP }: ChunkOptions = {}
): Chunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const sentences = splitSentences(text);
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;
  let charOffset = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokenCount + sentenceTokens > chunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ');
      const startChar = text.indexOf(currentChunk[0], Math.max(0, charOffset - 100));
      const endChar = startChar + chunkText.length;

      chunks.push({
        content: chunkText,
        chunkIndex: chunks.length,
        startChar: Math.max(0, startChar),
        endChar: Math.min(text.length, endChar),
        tokenCount: currentTokenCount,
      });

      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const sentTokens = estimateTokens(currentChunk[j]);
        if (overlapTokens + sentTokens > chunkOverlap) break;
        overlapSentences.unshift(currentChunk[j]);
        overlapTokens += sentTokens;
      }

      currentChunk = [...overlapSentences];
      currentTokenCount = overlapTokens;
      charOffset = startChar + chunkText.length;
    }

    currentChunk.push(sentence);
    currentTokenCount += sentenceTokens;
  }

  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ');
    const startChar = text.indexOf(currentChunk[0], Math.max(0, charOffset - 100));
    const endChar = startChar + chunkText.length;

    chunks.push({
      content: chunkText,
      chunkIndex: chunks.length,
      startChar: Math.max(0, startChar),
      endChar: Math.min(text.length, endChar),
      tokenCount: currentTokenCount,
    });
  }

  console.log(`[Chunker] Split document into ${chunks.length} chunks (avg ${Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / Math.max(chunks.length, 1))} tokens/chunk)`);
  return chunks;
}

export function chunkDocuments(documents: { id: string; cleanedContent?: string; abstract?: string; content?: string }[], options: ChunkOptions = {}): Chunk[] {
  const allChunks: Chunk[] = [];

  for (const doc of documents) {
    const textToChunk = doc.cleanedContent || doc.abstract || doc.content || '';
    const chunks = chunkDocument(textToChunk, options);

    for (const chunk of chunks) {
      allChunks.push({ ...chunk, sourceId: doc.id });
    }
  }

  console.log(`[Chunker] Total chunks from ${documents.length} documents: ${allChunks.length}`);
  return allChunks;
}
