# Module: Pipeline (RAG)

| Item | Value |
|------|-------|
| State | Production |
| Route Prefix | N/A (internal module, triggered via feed/generate/admin routes or CLI worker) |
| Middleware | N/A (runs in worker process or in-process via SSE) |
| Dependencies | NVIDIA NIM API, arXiv API, CrossRef API, PubMed API, BullMQ, PGVector |

## Purpose

Full RAG (Retrieval-Augmented Generation) pipeline: mengambil paper ilmiah dari arXiv → membersihkan → memotong → embedding → vector search → LLM generation → fact-check → moderasi → publish. Semua langkah berjalan sequential, diorkestrasi oleh `executePipeline()` di `queue/workers/pipelineWorker.ts`. Pipeline dijalankan via BullMQ worker (async) atau in-process (SSE refresh).

## Pipeline Steps

```
crawl → clean → chunk → embed → vector store → retrieve → generate → fact-check → moderate → publish
```

## Quick Links

- Crawler → [crawler.md](./crawler.md)
- Pipeline Steps → [steps.md](./steps.md)
- Models → [models.md](./models.md)
- Dependencies → [dependencies.md](./dependencies.md)
