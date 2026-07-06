/**
 * Vector Store — PGVector Operations
 *
 * Operasi CRUD untuk embedding vectors di PostgreSQL + pgvector.
 * Menggunakan Prisma $queryRaw untuk operasi vector native.
 */

import { getEmbeddingDimension } from './embedder';
import prisma from '../lib/prisma';

export async function initializeVectorStore(): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('[VectorStore] pgvector extension enabled');

    const dimension = getEmbeddingDimension();

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'document_chunks' AND column_name = 'embedding'
        ) THEN
          ALTER TABLE document_chunks ADD COLUMN embedding vector(${dimension});
        END IF;
      END $$;
    `);
    console.log(`[VectorStore] Vector column (dim: ${dimension}) ensured on document_chunks`);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
      ON document_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);
    console.log('[VectorStore] HNSW index created/ensured');

    return true;
  } catch (error: any) {
    console.error('[VectorStore] Initialization error:', error.message);
    throw error;
  }
}

export async function insertChunkWithEmbedding(chunk: any, embedding: number[] | null) {
  const dbChunk = await prisma.documentChunk.create({
    data: {
      sourceId: chunk.sourceId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      tokenCount: chunk.tokenCount || null,
      embedded: true,
    },
  });

  if (embedding) {
    const vectorStr = `[${embedding.join(',')}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE document_chunks SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      dbChunk.id
    );
  }

  return dbChunk;
}

export async function insertChunksWithEmbeddings(chunks: any[], embeddings: (number[] | null)[]) {
  const results: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const result = await insertChunkWithEmbedding(chunks[i], embeddings[i]);
      results.push(result);
    } catch (error: any) {
      console.error(`[VectorStore] Failed to insert chunk ${i}:`, error.message);
    }
  }

  console.log(`[VectorStore] Inserted ${results.length}/${chunks.length} chunks with embeddings`);
  return results;
}

export async function searchSimilar(queryEmbedding: number[], topK = 5, maxDistance = 1.0) {
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  try {
    const results = await prisma.$queryRawUnsafe(`
      SELECT
        dc.id,
        dc.content,
        dc.chunk_index,
        dc.source_id,
        dc.token_count,
        dc.embedding <=> $1::vector AS distance,
        ks.title AS source_title,
        ks.external_id AS source_external_id,
        ks.url AS source_url,
        ks.source_type,
        ks.authors
      FROM document_chunks dc
      JOIN knowledge_sources ks ON dc.source_id = ks.id
      WHERE dc.embedding IS NOT NULL
        AND dc.embedding <=> $1::vector < $2
      ORDER BY dc.embedding <=> $1::vector ASC
      LIMIT $3
    `, vectorStr, maxDistance, topK);

    console.log(`[VectorStore] Found ${(results as any[]).length} similar chunks (topK: ${topK})`);
    return results as any[];
  } catch (error: any) {
    console.error('[VectorStore] Similarity search error:', error.message);
    throw error;
  }
}

export async function getEmbeddedChunkCount(): Promise<number> {
  return prisma.documentChunk.count({ where: { embedded: true } });
}
