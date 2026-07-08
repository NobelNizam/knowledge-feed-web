# ADR 002 — BullMQ Queue for AI Pipeline

## Status

Accepted (implemented)

---

## Context

RAG pipeline bisa memakan waktu 10-30 detik. Jalankan synchronous di Express route handler akan memblokir event loop dan menyebabkan request timeout untuk pengguna lain. Dibutuhkan mekanisme async job processing.

Alternatif: in-process async (Promise + polling). Ditolak karena: tidak ada persistence, tidak bisa retry, tidak bisa monitor progress.

Alternatif: external job queue service (AWS SQS, RabbitMQ). Ditolak karena: menambah infrastruktur, tidak gratis, overkill untuk solo developer.

---

## Decision

Gunakan BullMQ (Redis-backed) untuk queue system:
- Satu queue: `CONTENT_PIPELINE` (content-pipeline)
- Worker process: `createPipelineWorker()` di `index.ts` (in-process)
- Job persistence: `PipelineJob` table di PostgreSQL (status, progress, input/output, error)
- Retry: 3 attempts, exponential backoff (5s base)
- Cleanup: `removeOnComplete: 100`, `removeOnFail: 50`
- Redis: ioredis singleton (`getRedisConnection()`) shared across queues + cache service

---

## Consequences

### Positive

- Async pipeline execution — tidak blocking Express event loop
- Job persistence via PostgreSQL — monitoring dan debugging
- Automatic retry dengan exponential backoff
- Graceful shutdown via `SIGTERM` handler

### Trade-offs

- Redis dependency — pipeline worker tidak jalan jika Redis down
- Worker in-process → tetap konsumsi memori yang sama dengan Express
- Single worker → pipeline jobs antri jika banyak request

### Risks

- Redis lock di SSE refresh path (separate dari BullMQ) — dua mekanisme lock berbeda
- ioredis type conflicts dengan BullMQ's bundled ioredis → `as any` cast
- `getRedisConnection()` singleton — jika Redis reconnect, semua service harus reconnect juga
