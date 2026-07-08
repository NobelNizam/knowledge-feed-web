# NVIDIA NIM Integration

> **Status:** DATA FILE — Update saat ada perubahan integrasi.

---

## Service Identity

| Item | Detail |
|------|--------|
| Provider | NVIDIA |
| Purpose | LLM inference (content generation) + text embedding (vector search) |
| Docs URL | https://build.nvidia.com/explore/discover |
| SDK/Package | `openai` npm package (OpenAI-compatible API) |

---

## Authentication

| Item | Detail |
|------|--------|
| Method | API Key |
| Location | Header `Authorization: Bearer {NVIDIA_API_KEY}` |
| `.env` Key | `NVIDIA_API_KEY` |
| `.env.example` | `NVIDIA_API_KEY=` |

---

## Connection

| Item | Detail |
|------|--------|
| Base URL | `https://integrate.api.nvidia.com/v1` (configurable via `NVIDIA_API_BASE_URL`) |
| Rate Limit | Free tier: limited requests/min |
| Timeout | 3 minutes (180s) per request |
| Max Retries | 2 (exponential backoff) |

---

## Endpoints Used

| Method | Endpoint | Purpose | Code Location |
|--------|----------|---------|---------------|
| POST | `/chat/completions` | LLM content generation | `backend/src/services/aiGenerator.ts:generateWithRAG()` |
| POST | `/embeddings` | Text embedding (1024-dim) | `backend/src/pipeline/embedder.ts:embedBatch()` |

---

## Models Used

| Model ID | Purpose | Context Window | Notes |
|----------|---------|---------------|-------|
| `meta/llama-3.1-70b-instruct` | Knowledge card generation | 4096 tokens input (free tier) | Prompt engineered for JSON output with domain, title, content, tags |
| `nvidia/nv-embedqa-e5-v5` | Text embedding | — | 1024-dimensional vectors for PGVector |

---

## Error Handling

| Scenario | Behavior | User Message |
|----------|----------|-------------|
| Timeout (>3 min) | Retry 2x | "Gagal menghasilkan konten" via SSE |
| Invalid response (non-JSON) | Parse attempt with regex fallback | Error log + retry atau skip card |
| Rate limited | Built-in retry via SDK | Pipeline step delayed/failed |
| API key invalid | Fails fast | "NVIDIA API key tidak valid" |

**Fallback behavior**: Jika LLM generation gagal, pipeline bisa fallback ke `generateKnowledgeCards` legacy (tanpa RAG context) via CLI worker `simple` mode. Tidak ada fallback di production pipeline path.
