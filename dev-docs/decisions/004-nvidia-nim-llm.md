# ADR 004 — NVIDIA NIM as LLM Provider

## Status

Accepted (implemented)

---

## Context

Platform membutuhkan LLM untuk menghasilkan konten knowledge card dari konteks paper ilmiah. LLM juga digunakan untuk text embedding (konversi teks → vector 1024-dim untuk similarity search).

Alternatif: OpenAI (GPT-4/GPT-3.5). Ditolak karena: berbayar, rate limit ketat di free tier, tidak ada embedding gratis.

Alternatif: Google Gemini. Ditolak karena: API key terpisah, pricing tidak transparan. DOCS.md pernah menyebut Gemini tapi codebase sudah fully NVIDIA NIM.

Alternatif: self-hosted open-source LLM (Ollama, llama.cpp). Ditolak karena: butuh GPU server, kompleksitas operasional, tidak cocok untuk solo developer free-tier deployment.

---

## Decision

Gunakan NVIDIA NIM API:
- LLM: `meta/llama-3.1-70b-instruct` (open-source, performa baik untuk Indo/EN)
- Embedding: `nvidia/nv-embedqa-e5-v5` (1024-dim, dioptimasi untuk QA retrieval)
- SDK: OpenAI-compatible (`openai` npm package) — switchable ke provider lain
- Timeout: 3 menit (NIM inference bisa lambat di free tier)
- Retry: 2x dengan exponential backoff
- Prompt: token-aware truncation (3000 chars max), domain-aware instruction, JSON output format

---

## Consequences

### Positive

- Gratis untuk development (NVIDIA free tier)
- OpenAI-compatible API → mudah switch provider
- Satu API key untuk LLM + embedding
- Model open-source → tidak ada vendor lock-in untuk model
- Embedding dimension 1024 — kompatibel dengan PGVector

### Trade-offs

- Free tier rate limit → pipeline bisa lambat
- Llama 3.1 70B via API lebih lambat dibanding model hosted self
- JSON output format tidak selalu konsisten → perlu parsing defensif
- Prompt engineering spesifik untuk Llama → tidak portable ke model lain tanpa tuning

### Risks

- NIM API bisa berubah/deprecated → mitigasi: OpenAI-compatible interface, bisa switch
- Free tier bisa dihentikan → mitigasi: fallback ke model lain via OpenAI-compatible API
- LLM output tidak terprediksi (domain, format) → mitigasi: domain validation + JSON parse fallback
