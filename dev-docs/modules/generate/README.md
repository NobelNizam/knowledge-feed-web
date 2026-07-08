# Module: Generate

| Item | Value |
|------|-------|
| State | Production |
| Route Prefix | `/api/generate` |
| Middleware | `authMiddleware` (admin-only on POST /, GET /stats) |
| Dependencies | BullMQ, `queue/queueManager.ts`, `queue/workers/pipelineWorker.ts`, `pipeline/publisher.ts` |

## Purpose

API untuk memicu dan memantau AI content pipeline secara manual. Admin dapat memicu pipeline dengan topik spesifik (sync atau async via BullMQ), cek status job, lihat statistik queue, dan list knowledge sources.

## Quick Links

- Routes → [routes.md](./routes.md)
- Dependencies → [dependencies.md](./dependencies.md)
