/**
 * Retriever & Context Builder
 * 
 * Mencari chunk yang relevan dari vector store berdasarkan query,
 * lalu membangun context string untuk LLM prompt.
 */

const { embedText } = require('./embedder');
const { searchSimilar } = require('./vectorStore');

/**
 * Retrieve relevant chunks untuk sebuah query/topic
 * @param {string} query - Search query or topic
 * @param {Object} [options]
 * @param {number} [options.topK=5] - Number of chunks to retrieve
 * @param {number} [options.maxDistance=1.0] - Maximum cosine distance
 * @returns {Promise<Object>} Retrieved context with metadata
 */
async function retrieve(query, { topK = 5, maxDistance = 1.0 } = {}) {
  console.log(`[Retriever] Searching for: "${query}" (topK: ${topK})`);

  // Generate query embedding
  const queryEmbedding = await embedText(query);

  // Search for similar chunks
  const results = await searchSimilar(queryEmbedding, topK, maxDistance);

  if (results.length === 0) {
    console.log('[Retriever] No relevant chunks found');
    return {
      context: '',
      sourceChunks: [],
      metadata: { query, topK, resultsFound: 0 },
    };
  }

  // Build context from chunks
  const context = buildContext(results);

  // Extract unique sources for citations
  const sourceChunks = results.map(r => ({
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

  console.log(`[Retriever] Retrieved ${results.length} chunks from ${new Set(results.map(r => r.source_id)).size} sources`);

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

/**
 * Build context string dari retrieved chunks
 * Format yang optimal untuk LLM prompt
 * @param {Array<Object>} chunks - Retrieved chunk results
 * @returns {string} Formatted context string
 */
function buildContext(chunks) {
  if (!chunks || chunks.length === 0) return '';

  const contextParts = chunks.map((chunk, index) => {
    const sourceInfo = chunk.source_title
      ? `[Source ${index + 1}: "${chunk.source_title}"${chunk.source_external_id ? ` (${chunk.source_external_id})` : ''}]`
      : `[Source ${index + 1}]`;

    return `${sourceInfo}\n${chunk.content}`;
  });

  return contextParts.join('\n\n---\n\n');
}

/**
 * Build citations array dari retrieved chunks
 * @param {Array<Object>} sourceChunks - Source chunks dari retrieve()
 * @returns {Array<Object>} Deduplicated citations
 */
function buildCitations(sourceChunks) {
  const seen = new Set();
  const citations = [];

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

/**
 * Retrieve context untuk multiple queries/topics
 * @param {string[]} queries - Array of queries
 * @param {Object} [options] - Retrieve options
 * @returns {Promise<Object>} Combined context and metadata
 */
async function retrieveMultiple(queries, options = {}) {
  const allChunks = [];
  const allContexts = [];

  for (const query of queries) {
    const result = await retrieve(query, options);
    if (result.context) {
      allContexts.push(result.context);
      allChunks.push(...result.sourceChunks);
    }
  }

  // Deduplicate chunks by chunkId
  const seenChunkIds = new Set();
  const uniqueChunks = allChunks.filter(c => {
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
      totalSources: new Set(uniqueChunks.map(c => c.sourceId)).size,
    },
  };
}

module.exports = {
  retrieve,
  retrieveMultiple,
  buildContext,
  buildCitations,
};
