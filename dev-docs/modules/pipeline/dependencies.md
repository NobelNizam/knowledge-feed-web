# Pipeline — Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| openai | 4.20 | NVIDIA NIM API client (OpenAI-compatible SDK) |
| xml2js | 0.6 | arXiv API XML parsing |
| bullmq | 5.79 | Queue system for async pipeline execution |
| ioredis | 5.11 | Redis client (queue backend) |

**External APIs**:

| Service | Purpose | Env Key | Base URL |
|---------|---------|---------|----------|
| NVIDIA NIM (LLM) | Content generation via Llama 3.1 70B | `NVIDIA_API_KEY` | `NVIDIA_API_BASE_URL` |
| NVIDIA NIM (Embed) | Text embedding (1024-dim) | `NVIDIA_API_KEY` | Same base URL |
| arXiv API | Paper fetching (OAI-PMH) | — | `http://export.arxiv.org/api/query` |
| CrossRef API | Fact-check claim verification | — | `https://api.crossref.org` |
| PubMed API | Fact-check claim verification | `NCBI_API_KEY` (optional) | `https://eutils.ncbi.nlm.nih.gov` |

**Env variables**:
- `NVIDIA_API_KEY` (wajib) — NVIDIA NIM API key
- `NVIDIA_API_BASE_URL` — API base URL (default: `https://integrate.api.nvidia.com/v1`)
- `NVIDIA_MODEL` — LLM model (default: `meta/llama-3.1-70b-instruct`)
- `NVIDIA_EMBED_MODEL` — Embedding model (default: `nvidia/nv-embedqa-e5-v5`)
- `PIPELINE_CHUNK_SIZE` — Chunk size in tokens (default: 512)
- `PIPELINE_CHUNK_OVERLAP` — Chunk overlap (default: 64)
- `FACT_CHECK_MIN_CONFIDENCE` — Minimum confidence threshold (default: 0.6)
- `ARXIV_QUERY_TOPICS` — Default topics for arXiv query
- `NCBI_API_KEY` — Optional PubMed API key
