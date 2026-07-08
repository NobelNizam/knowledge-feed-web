# Module: Feed

| Item | Value |
|------|-------|
| State | Production |
| Route Prefix | `/api/feed` |
| Middleware | `authMiddleware` (POST /refresh, GET /refresh/sse) |
| Dependencies | BullMQ, Redis (ioredis), `services/cacheService.ts`, `services/domainHierarchy.ts` |

## Purpose

Endpoint utama untuk timeline feed. Menyediakan feed umum + terpersonalisasi dengan Redis caching per-domain, infinite scroll pagination, pull-to-refresh via SSE (Server-Sent Events) dengan RAG pipeline real-time, dan enrichment interaksi pengguna (like/dislike/save/comment counts).

## Quick Links

- Routes → [routes.md](./routes.md)
- Services → [services.md](./services.md)
- Dependencies → [dependencies.md](./dependencies.md)
