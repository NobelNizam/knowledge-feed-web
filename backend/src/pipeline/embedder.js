/**
 * Embedder — NVIDIA NIM Embedding
 * 
 * Generate embedding vectors menggunakan NVIDIA NIM Embedding API.
 * Menggunakan direct HTTP call karena NVIDIA NIM memerlukan parameter
 * non-standard (input_type) yang tidak kompatibel dengan OpenAI SDK.
 */

const axios = require('axios');

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE_URL = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const EMBED_MODEL = process.env.NVIDIA_EMBED_MODEL || 'nvidia/nv-embedqa-e5-v5';
const MAX_BATCH_SIZE = 16; // NVIDIA NIM batch limit

/**
 * Direct NVIDIA NIM embedding API call
 * @param {string|string[]} input - Text or array of texts
 * @param {string} inputType - 'query' or 'passage'
 * @returns {Promise<Object>} API response
 */
async function callEmbeddingAPI(input, inputType) {
  const response = await axios.post(
    `${NVIDIA_API_BASE_URL}/embeddings`,
    {
      model: EMBED_MODEL,
      input: input,
      input_type: inputType,
      encoding_format: 'float',
    },
    {
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );
  return response.data;
}

/**
 * Generate embedding untuk single text (query mode)
 * @param {string} text - Text to embed
 * @param {string} [inputType='query'] - Input type: 'query' for search, 'passage' for documents
 * @returns {Promise<number[]>} Embedding vector
 */
async function embedText(text, inputType = 'query') {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  try {
    const response = await callEmbeddingAPI(text, inputType);
    return response.data[0].embedding;
  } catch (error) {
    const errMsg = error.response?.data?.detail || error.message;
    console.error('[Embedder] Error generating embedding:', errMsg);
    throw new Error(`Embedding failed: ${errMsg}`);
  }
}

/**
 * Generate embeddings untuk batch of texts (passage mode)
 * @param {string[]} texts - Array of texts to embed
 * @param {string} [inputType='passage'] - Input type for all texts
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function embedBatch(texts, inputType = 'passage') {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  if (texts.length === 0) return [];

  const allEmbeddings = [];

  // Process in batches to respect API limits
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);

    console.log(`[Embedder] Processing batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(texts.length / MAX_BATCH_SIZE)} (${batch.length} texts)`);

    try {
      const response = await callEmbeddingAPI(batch, inputType);

      // Sort by index to maintain order
      const sorted = response.data.sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sorted.map(d => d.embedding));
    } catch (error) {
      const errMsg = error.response?.data?.detail || error.message;
      console.error(`[Embedder] Batch ${Math.floor(i / MAX_BATCH_SIZE) + 1} failed:`, errMsg);

      // Fallback: embed individually for this batch
      for (const text of batch) {
        try {
          const embedding = await embedText(text, inputType);
          allEmbeddings.push(embedding);
        } catch (individualError) {
          console.error('[Embedder] Individual embedding failed:', individualError.message);
          // Push null as placeholder
          allEmbeddings.push(null);
        }
      }
    }
  }

  console.log(`[Embedder] Generated ${allEmbeddings.filter(Boolean).length}/${texts.length} embeddings`);
  return allEmbeddings;
}

/**
 * Get embedding dimension untuk model saat ini
 * @returns {number} Expected embedding dimension
 */
function getEmbeddingDimension() {
  // nvidia/nv-embedqa-e5-v5 produces 1024-dimensional embeddings
  // snowflake/arctic-embed-l produces 1024-dimensional embeddings
  return 1024;
}

module.exports = {
  embedText,
  embedBatch,
  getEmbeddingDimension,
  EMBED_MODEL,
};
