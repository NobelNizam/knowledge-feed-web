# FINAL_SYSTEM_HANDOVER

> **Status:** DATA FILE — Update setelah push ke dev.
> **Note:** BOLEH di-include di `main` sebagai referensi handover. DILARANG mengandung credential atau secret.

---

## System Identity

| Repo | Branch | Version | Last Commit |
|------|--------|---------|------------|
| root (monorepo) | `docs` | dev (pre-release) | `a43ece7` |

| Project Type | Fullstack (Monorepo) |
| Last Updated | 2026-07-08 |
| Handover Agent | AI (deepseek-v4-pro) — onboarding analysis |

---

## Current Architecture Summary

Knowledge Feed Web adalah platform edukasi AI-powered fullstack monorepo. Backend Express/TypeScript menyediakan REST API (6 route modules) dengan PostgreSQL+PGVector untuk data relasional dan vector search, Redis untuk feed cache dan BullMQ queue, serta NVIDIA NIM API untuk LLM inference dan embedding. Frontend Next.js 14 (App Router, 100% CSR) mengonsumsi API via native fetch dengan cookie JWT auth + auto-refresh interceptor.

RAG Pipeline adalah inti platform: paper ilmiah dari arXiv di-crawl → dibersihkan → dipotong → di-embed (1024-dim) → disimpan ke PGVector → di-retrieve sebagai konteks → LLM menghasilkan knowledge card → fact-check via CrossRef/PubMed → moderasi otomatis → publish ke feed. Pipeline berjalan async via BullMQ worker, dengan opsi trigger manual (SSE refresh, admin endpoint) atau CLI worker.

Keamanan: JWT cookie auth (access 15min + refresh 7d), refresh token SHA-256 hash di DB, rate limiting (global 1000 req/15min, auth 10 req/15min), request logging dengan PII redaction, helmet security headers, CORS origin allowlist, trust proxy untuk TLS termination. 6 open issues tersisa (O1-O7) — prioritas pada comment PII leak dan CSRF middleware.

---

## Active Modules Status

| Module | Repo | State | Notes |
|--------|------|-------|-------|
| Auth | backend | Production | Email+password, JWT cookie, SHA-256 hashed refresh token, rate-limited register/login |
| Auth | frontend | Production | Login, register, logout, auto-refresh interceptor |
| Feed | backend | Production | Redis-cached per-domain, BullMQ async refresh, SSE pipeline progress |
| Feed | frontend | Production | Infinite scroll, pull-to-refresh, filter tabs, onboarding, sessionStorage cache |
| Knowledge | backend | Production | Search (ILIKE), trending, like/view/share/dislike/report/comment |
| Knowledge | frontend | Production | Card detail, comments (nested replies), interactions |
| User | backend | Production | Preferences, save/unsave card (denormalized saveCount), profile |
| User | frontend | Production | Profile, settings, saved cards, liked topics |
| Admin | backend | Beta | User stats OK; pipeline/config endpoints = placeholder (no implementation) |
| Admin | frontend | Production | AdminGuard, reports inbox, delete feed |
| Pipeline | backend | Production | Full RAG: arXiv crawl → clean → chunk → embed (NIM) → vector store (PGVector) → retrieve → LLM generate (NIM) → fact-check → moderate → publish |
| Queue | backend | Production | BullMQ, Redis, worker process, PipelineJob tracking |
| Search | backend | Production | ILIKE `title contains` (tsvector deferred) |
| Search | frontend | Production | Keyword search + domain filter |

---

## Recent Changes (Since Last Handover)

| Date | Repo | Type | Description | Impact |
|------|------|------|-------------|--------|
| 2026-07 | backend | feat | Dislike + reporting system with engagement score | New DB tables: dislikes, reports |
| 2026-07 | backend | feat | Content-based deduplication in publisher | Prevents duplicate cards |
| 2026-07 | backend | refactor | Optimize RAG context budget + token-aware truncation | Better LLM prompt quality |
| 2026-07 | backend | feat | Fuzzy domain matching + enhanced JSON parsing | More robust LLM output handling |
| 2026-07 | backend | refactor | Standardize API response with ApiResponse interface | Consistent response format |
| 2026-07 | backend | build | TypeScript 6.0.3 + linux-musl build target | Production Docker compatibility |
| 2026-07 | backend | chore | Docker compose env vars + openssl in Dockerfile | Container runtime support |

---

## Known Issues at Handover

| Area | Repo | Issue | Mitigation |
|------|------|-------|-----------|
| Comments API | backend | `user.email` leaked in response | Manual: hindari memanggil endpoint ini di public API |
| CSRF | backend | No Origin/Referer guard for mutation | SameSite: Lax pada cookie (proteksi parsial) |
| Admin | backend | Placeholder endpoints return success | Manual: jangan gunakan endpoint tersebut |
| Search | backend | ILIKE, bukan full-text | Clamp limit 100 — dataset kecil (<10K) masih OK |
| Refresh token | backend | Not rotated | Hash SHA-256 di DB — DB breach aman |
| SSE pipeline | backend | In-process, blocks event loop | Redis lock — only 1 concurrent per user |

---

## What Needs to Happen Next

| Priority | Repo | Task | Blockers |
|----------|------|------|----------|
| P0 | backend | Fix comment email PII leak (O1) | None |
| P0 | backend | Add CSRF middleware (O2) | None |
| P1 | both | Rename branch `docs` → `dev` | None |
| P1 | backend | Fix admin placeholder endpoints → 501 (O3) | None |
| P2 | frontend | Add unit tests (minimal) | None |
| P2 | backend | Verify `npm run lint` frontend + backend | None |

---

## Deployment Notes

| Repo | DB Migration | Config Baru | Restart Service | Notes |
|------|-------------|------------|----------------|-------|
| backend | Phase 2 indexes sudah di-migrate | `.env` dengan NVIDIA_API_KEY wajib | Ya (restart Express + worker) | Gunakan `npx prisma migrate deploy` |
| frontend | N/A | `API_UPSTREAM_URL` di Vercel env | Auto-deploy via Vercel | Next.js build auto-trigger |

---

## Verification Commands

```bash
# Backend (local)
cd backend && curl http://localhost:3001/health
cd backend && npm run typecheck
cd backend && npm test

# Frontend (local)
cd web && curl http://localhost:3000
cd web && npm run build
cd web && npm run lint
```
