/**
 * Chunker — Document Chunking
 * 
 * Memecah dokumen menjadi chunk kecil dengan overlap
 * untuk diproses embedding dan retrieval.
 */

const DEFAULT_CHUNK_SIZE = parseInt(process.env.PIPELINE_CHUNK_SIZE) || 500;
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.PIPELINE_CHUNK_OVERLAP) || 50;

/**
 * Estimasi jumlah token dari teks (rough approximation: 1 token ≈ 4 chars)
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Split teks menjadi kalimat-kalimat
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  // Split pada titik, tanda tanya, tanda seru yang diikuti spasi dan huruf kapital
  // Juga handle abbreviations umum
  const sentences = text
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1|SPLIT|')
    .replace(/\n\n/g, '|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Chunk dokumen menggunakan sentence-based chunking dengan overlap
 * @param {string} text - Document text to chunk
 * @param {Object} [options]
 * @param {number} [options.chunkSize=500] - Target chunk size in tokens
 * @param {number} [options.chunkOverlap=50] - Overlap size in tokens
 * @returns {Array<Object>} Array of chunk objects
 */
function chunkDocument(text, { chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP } = {}) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const sentences = splitSentences(text);
  const chunks = [];
  let currentChunk = [];
  let currentTokenCount = 0;
  let charOffset = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokens(sentence);

    // Jika menambah kalimat ini melebihi chunk size, simpan chunk saat ini
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

      // Overlap: ambil beberapa kalimat terakhir untuk chunk berikutnya
      const overlapSentences = [];
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

  // Simpan sisa chunk terakhir
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

/**
 * Chunk multiple documents
 * @param {Array<Object>} documents - Array of { id, content } objects
 * @param {Object} [options] - Chunking options
 * @returns {Array<Object>} All chunks with sourceId
 */
function chunkDocuments(documents, options = {}) {
  const allChunks = [];

  for (const doc of documents) {
    const textToChunk = doc.cleanedContent || doc.abstract || doc.content || '';
    const chunks = chunkDocument(textToChunk, options);

    for (const chunk of chunks) {
      allChunks.push({
        ...chunk,
        sourceId: doc.id,
      });
    }
  }

  console.log(`[Chunker] Total chunks from ${documents.length} documents: ${allChunks.length}`);
  return allChunks;
}

module.exports = {
  chunkDocument,
  chunkDocuments,
  splitSentences,
  estimateTokens,
};
