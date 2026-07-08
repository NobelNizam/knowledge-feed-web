# Backend Structure

> **Status:** DATA FILE — Update saat ada perubahan struktur backend.
> **Purpose:** Dokumentasi struktur direktori backend, organisasi route, middleware, dan komponen.

---

## Top-Level Backend Layout

| Path | Role |
|------|------|
| `backend/src/index.ts` | Entry point Express — setup middleware, mount routes, init pipeline worker, health check, graceful shutdown |
| `backend/src/lib/` | Core utilities: PrismaClient singleton, JWT secrets loader, logger |
| `backend/src/middleware/` | Auth middleware (JWT) + Admin role guard |
| `backend/src/routes/` | 6 route modules: auth, feed, knowledge, user, admin, generate |
| `backend/src/services/` | Business logic: AI generator (NVIDIA NIM), Cache service (Redis), Domain hierarchy |
| `backend/src/pipeline/` | 9-file RAG pipeline: crawl, clean, chunk, embed, vector store, retrieve, fact check, moderate, publish |
| `backend/src/queue/` | BullMQ setup + pipeline worker (job consumer) |
| `backend/src/workers/` | CLI entry points (contentGenerator) |
| `backend/src/tests/` | Jest test files (auth, feed, phase1-3) |
| `backend/src/types/` | TypeScript type declarations |
| `backend/prisma/` | Schema, migrations, seed |
| `backend/scripts/` | Utility scripts (backup, migrate-domains) |

---

## Route Organization

Setiap route module adalah file Express Router yang menangani satu domain bisnis:

| Route File | Prefix | Lines | Middleware | Key Handlers |
|-----------|--------|-------|------------|--------------|
| `routes/auth.ts` | `/api/auth` | 247 | `authLimiter` (10 req/15min) on register/login | POST register, login, logout, refresh; GET me |
| `routes/feed.ts` | `/api/feed` | 477 | `authMiddleware` on refresh/SSE | GET /, POST /personalized, POST /refresh, GET /refresh/sse |
| `routes/knowledge.ts` | `/api/knowledge` | 466 | `authMiddleware` on like/dislike/report/comment | GET search/trending/domains/tags/:id, POST like/view/share/dislike/report/comments |
| `routes/user.ts` | `/api/user` | 131 | `authMiddleware` (router-level) | PUT preferences, POST save, PUT profile |
| `routes/admin.ts` | `/api/admin` | 98 | `authMiddleware` + `adminMiddleware` (router-level) | POST pipeline/status, POST config/fact-check, GET stats/users, DELETE feed/:id, GET/DELETE reports |
| `routes/generate.ts` | `/api/generate` | 180 | `authMiddleware` (admin-only on POST) | POST /, GET /status/:jobId, GET /stats, GET /sources |

Pattern: Route file menangani logic langsung — tidak ada service layer terpisah untuk CRUD sederhana. Pengecualian: `services/aiGenerator.ts` (kompleksitas LLM), `services/cacheService.ts` (Redis abstraction), `services/domainHierarchy.ts` (topic mapping).

---

## Middleware Stack

| Middleware | File | Purpose | Applied To |
|-----------|------|---------|-----------|
| helmet | npm | Security headers (CSP, HSTS, X-Frame-Options) | Global |
| cors | npm | Origin check: localhost, FRONTEND_URL, *.trycloudflare.com (dev) | Global, `credentials: true` |
| cookieParser | npm | Parse cookies | Global |
| express.json | npm | Body parser | Global |
| request logger | inline `index.ts:62-85` | Log method, URL, sanitized body (10 PII fields redacted) | Global |
| rate limiter | npm `express-rate-limit` | 1000 req/15min per IP | Global `/api` prefix |
| authMiddleware | `middleware/auth.ts` | JWT verify `token` cookie or Authorization header, set `req.user` | Per-route |
| adminMiddleware | `middleware/admin.ts` | Role check `req.user.role === 'ADMIN'` | Per-route (on top of auth) |
| authLimiter | inline `auth.ts:13-17` | 10 req/15min | register, login only |

---

## Service Layer Usage

Proyek ini tidak memiliki service layer yang ketat. Route handler menangani business logic langsung via Prisma. Tiga file services ada untuk abstraksi yang memang butuh pemisahan:

| Service | Purpose | Used By |
|---------|---------|---------|
| `services/aiGenerator.ts` | NVIDIA NIM LLM integration — prompt building, JSON parsing, token-aware context truncation | pipeline worker, SSE refresh |
| `services/cacheService.ts` | Redis abstraction — get/set/invalidate domain feed cache, SCAN-based key deletion | feed route, admin route, publisher |
| `services/domainHierarchy.ts` | Topic mapping — resolve filter type ke discipline list, get level-2 subdomains | feed refresh, SSE refresh |

---

## Command Architecture

| Command | Purpose | Schedule |
|---------|---------|----------|
| `npm run dev` | Start backend with hot reload (`tsx watch`) | Development |
| `npm run build` | TypeScript compile (`tsc --outDir dist`) | Production build |
| `npm start` | Run compiled backend (`node dist/index.js`) | Production |
| `npm run generate` | Run content generator CLI (`tsx src/workers/contentGenerator.ts`) | Manual / cron |
| `npm test` | Run Jest tests (`jest --detectOpenHandles --forceExit`) | CI / manual |
| `npm run typecheck` | TypeScript type check (`tsc --noEmit`) | CI / manual |
