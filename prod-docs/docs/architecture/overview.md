# Arsitektur — Knowledge Feed Web (Production)

> **Environment:** Production
> **Last Updated:** 2026-07-08

---

## Ringkasan

Knowledge Feed Web adalah platform edukasi AI-powered dengan arsitektur **terdistribusi berbasis managed services**. Frontend Next.js di-deploy ke Vercel, backend Express/TypeScript di-deploy ke Render. Database PostgreSQL+PGVector menggunakan Neon (serverless), Redis cache + BullMQ queue menggunakan Upstash (serverless). AI inference menggunakan NVIDIA NIM API (eksternal).

---

## Diagram Arsitektur

```
                          User
                            │
                            ▼
                    bishamon.vercel.app
                    (Vercel — Next.js)
                            │
                     Next.js rewrites
                      /api/* → backend
                            │
                            ▼
                   bishamonback.onrender.com
                   (Render — Express/TS)
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
      Neon (PG)        Upstash (Redis)    NVIDIA NIM API
   PostgreSQL+PGVector   Cache + Queue    LLM + Embedding
```

---

## Komponen Utama

| Komponen | Platform | Tech | Fungsi |
|----------|----------|------|--------|
| Frontend | Vercel | Next.js 14.2.35, React 18, Tailwind | UI infinite scroll feed, auth, interaksi |
| Backend API | Render | Express/TypeScript, Node.js 22 | REST API, auth, feed logic, RAG pipeline trigger |
| Database | Neon | PostgreSQL 14 + PGVector | Data relasional + vector search |
| Cache | Upstash | Redis 7 | Domain feed cache (TTL 15 min), anonymous view dedup |
| Queue | Upstash (Redis) | BullMQ 5.79 | Async pipeline jobs (content-pipeline queue) |
| AI/LLM | NVIDIA NIM | Llama 3.1 70B | Content generation |
| AI/Embed | NVIDIA NIM | nv-embedqa-e5-v5 | Text embedding (1024-dim) |

---

## Data Flow

1. User akses `https://bishamon.vercel.app`
2. Next.js serve static shell → React hydrate
3. Client-side `fetch('/api/...')` → Next.js rewrite → `https://bishamonback.onrender.com/api/...`
4. Express route handler → Prisma query → Neon PostgreSQL
5. Feed cache: cek Upstash Redis → hit → return; miss → query DB → cache
6. Pipeline: POST `/api/feed/refresh` → BullMQ job → Upstash Redis queue → worker execute RAG pipeline (arXiv → NIM embed → NIM LLM → fact-check → moderate → publish to DB)
7. Response JSON → Next.js → render UI

---

## Security Layers

| Layer | Implementation |
|-------|---------------|
| Transport | HTTPS (Vercel + Render auto) |
| Auth | JWT access (15 min) + refresh (7 hari), HttpOnly cookies |
| CSRF | Origin/Referer guard middleware |
| Input | Rate limiting (1000 req/15min), clamp limit di trust boundary |
| Headers | helmet (CSP, HSTS, X-Frame-Options) |
| Secrets | Semua di environment variables dashboard (tidak di repo) |
| PII | Request logger redact 10 field sensitif |
| CORS | Whitelist: bishamon.vercel.app, localhost (dev) |

---

## Scaling Considerations

- **Vercel**: Auto-scaling, global edge CDN
- **Render**: Single instance, upgrade ke paid plan untuk always-on + multi-instance
- **Neon**: Serverless auto-scale, upgrade untuk lebih banyak storage + compute
- **Redis**: Upgrade Upstash untuk lebih banyak memori + commands
- **Queue**: Single worker in-process dengan Express. Scale path: dedicated worker process atau Render background worker

---

## Monitoring

| Tool | Purpose |
|------|---------|
| UptimeRobot | Ping `/health` tiap 14 menit (Render anti-sleep) |
| Vercel Analytics | Frontend traffic + performance |
| Render Dashboard | Backend logs + resource usage |
| Neon Dashboard | Database metrics + query performance |
