/**
 * Embedder — NVIDIA NIM Embedding
 *
 * Generate embedding vectors menggunakan NVIDIA NIM Embedding API.
 * Menggunakan direct HTTP call karena NVIDIA NIM memerlukan parameter
 * non-standard (input_type) yang tidak kompatibel dengan OpenAI SDK.
 */

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_BASE_URL = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';
export const EMBED_MODEL = process.env.NVIDIA_EMBED_MODEL || 'nvidia/nv-embedqa-e5-v5';
const MAX_BATCH_SIZE = 16;

async function callEmbeddingAPI(input: string | string[], inputType: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const response = await fetch(`${NVIDIA_API_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: Array.isArray(input) ? input : [input],
      input_type: inputType,
      encoding_format: 'float',
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP error! status: ${response.status} ${errText}`);
  }

  return await response.json();
}

export async function embedText(text: string, inputType = 'query'): Promise<number[]> {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  try {
    const response = await callEmbeddingAPI(text, inputType);
    return response.data[0].embedding;
  } catch (error: any) {
    const errMsg = error.response?.data?.detail || error.message;
    console.error('[Embedder] Error generating embedding:', errMsg);
    throw new Error(`Embedding failed: ${errMsg}`);
  }
}

export async function embedBatch(texts: string[], inputType = 'passage'): Promise<(number[] | null)[]> {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured');
  }

  if (texts.length === 0) return [];

  const allEmbeddings: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    console.log(`[Embedder] Processing batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(texts.length / MAX_BATCH_SIZE)} (${batch.length} texts)`);

    try {
      const response = await callEmbeddingAPI(batch, inputType);
      const sorted = response.data.sort((a: any, b: any) => a.index - b.index);
      allEmbeddings.push(...sorted.map((d: any) => d.embedding));
    } catch (error: any) {
      const errMsg = error.response?.data?.detail || error.message;
      console.error(`[Embedder] Batch ${Math.floor(i / MAX_BATCH_SIZE) + 1} failed:`, errMsg);

      for (const text of batch) {
        try {
          const embedding = await embedText(text, inputType);
          allEmbeddings.push(embedding);
        } catch (individualError: any) {
          console.error('[Embedder] Individual embedding failed:', individualError.message);
          allEmbeddings.push(null);
        }
      }
    }
  }

  console.log(`[Embedder] Generated ${allEmbeddings.filter(Boolean).length}/${texts.length} embeddings`);
  return allEmbeddings;
}

export function getEmbeddingDimension(): number {
  return 1024;
}
