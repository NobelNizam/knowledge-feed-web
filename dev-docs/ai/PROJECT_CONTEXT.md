# PROJECT_CONTEXT

> **Status:** DATA FILE — Update saat ada perubahan stack/struktur.
> **Purpose:** Overview sistem, stack teknologi, dan struktur project.

---

## System Overview

Knowledge Feed Web adalah platform edukasi AI-powered yang mengubah kebiasaan *doom scrolling* menjadi *wise scrolling*. Seluruh konten dihasilkan oleh AI melalui full RAG pipeline: paper ilmiah dari arXiv dikumpulkan (crawler), dibersihkan (cleaner), dipotong (chunker), di-embed (NVIDIA NIM embedding), disimpan ke vector store (PGVector), di-retrieve untuk konteks, lalu LLM (NVIDIA NIM Llama 3.1 70B) menghasilkan knowledge card. Setiap kartu melalui fact-check (CrossRef/PubMed), moderasi otomatis, dan deduplikasi sebelum dipublikasikan ke feed.

Pengguna mendaftar dengan email+password, memilih domain minat (dari 7 domain utama + 100+ disiplin), lalu mendapatkan infinite scrolling feed terpersonalisasi. Interaksi: like, dislike, save, share, comment, report. Admin dapat mengelola konten, melihat report, memicu pipeline AI.

Proyek ini adalah monorepo penuh dengan satu Git repository di root, berisi `backend/` (Express/TypeScript) dan `web/` (Next.js 14).

---

## Project Type Declaration

| Item | Value |
|------|-------|
| Project Type | Fullstack (Monorepo) |
| Git Location | Project root (single repo: `backend/` + `web/`) |

---

## Runtime Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express 4.18 + TypeScript (Node.js 22, runtime `tsx`) |
| Frontend | Next.js 14.2.35 + React 18 + TypeScript |
| Database Primary | PostgreSQL 14 + PGVector (via Docker: `pgvector/pgvector:pg14`) |
| ORM | Prisma 5.7 |
| Cache | Redis 7 (via Docker: `redis:7-alpine`) |
| Queue | BullMQ 5.79 (Redis-backed) |
| Search | ILIKE `title contains` (single column, leading wildcard — tsvector deferred) |
| Storage | MinIO (container jalan, belum diintegrasi aplikasi) |
| Web Server | Express langsung / Nginx (opsional) / Cloudflare tunnel (dev) |
| AI/LLM | NVIDIA NIM API (`meta/llama-3.1-70b-instruct`) |
| Embedding | NVIDIA NIM (`nvidia/nv-embedqa-e5-v5`, 1024-dim) |
| CDN | Cloudflare (belum di-setup) |
| Monitoring | Belum ada (deferred ke Production phase) |
| Logging | `console.*` + request logger middleware dengan PII redaction |
| DevOps | Docker Compose, GitHub Actions CI/CD (deferred) |

---

## UI/UX Template & Framework

### Template Status

| Item | Value |
|------|-------|
| Template HTML Provided? | TIDAK |
| Template Name | N/A |
| UI Framework | Tailwind CSS 3.4 |
| Component Library | shadcn/ui (Radix primitives) |
| Icons | lucide-react 1.21 |
| Theme | next-themes 0.4.6 (dark/light/system) |
| Font | Inter (next/font/google) |

### AI Rules (Template TIDAK disediakan)

- WAJIB menggunakan Tailwind CSS + shadcn/ui
- WAJIB mengikuti class-variance-authority + tailwind-merge patterns
- DILARANG membuat komponen UI dari nol yang sudah ada di shadcn/ui
- DILARANG membuat CSS framework custom
- BOLEH membuat custom CSS hanya untuk komponen spesifik yang tidak ada

---

## Database Topology

| Connection | Domain / Schema | Notes |
|-----------|----------------|-------|
| `DATABASE_URL` | `knowledge_feed` (PostgreSQL) | Primary DB — 11 model via Prisma, + PGVector extension via raw SQL |
| `REDIS_URL` | Redis | Cache feed (TTL 15 min) + BullMQ queue + anonymous view dedup (SETNX 24h) |

---

## Source Structure

| Path | Function |
|------|----------|
| `backend/src/index.ts` | Entry point Express — setup middleware (helmet, cors, rate-limit, cookie-parser, trust proxy), mount routes, init pipeline worker, health check |
| `backend/src/lib/` | Core utilities: PrismaClient singleton (`prisma.ts`), JWT secrets loader (`jwtSecrets.ts`), logger minimal |
| `backend/src/middleware/` | Auth middleware (JWT cookie verification, `auth.ts`) + Admin role guard (`admin.ts`) |
| `backend/src/routes/` | 6 route files: auth, feed, knowledge, user, admin, generate |
| `backend/src/services/` | AI Generator (NVIDIA NIM), Cache Service (Redis domain feed), Domain Hierarchy (topic mapping) |
| `backend/src/pipeline/` | 9-file RAG pipeline: crawler, cleaner, chunker, embedder, vectorStore, retriever, factChecker, moderator, publisher |
| `backend/src/queue/` | BullMQ setup (`queueManager.ts`) + worker (`workers/pipelineWorker.ts`) |
| `backend/src/workers/` | CLI entry point (`contentGenerator.ts`) |
| `backend/src/tests/` | 5 test files (Jest + ts-jest): auth, feed, phase1, phase2, phase3 — 29/29 pass |
| `backend/src/types/` | TypeScript type definitions |
| `backend/prisma/` | Schema (`schema.prisma`), migrations, seed |
| `web/app/` | Next.js App Router pages: layout (root), page (feed), login, register, card/[id], profile, profile/settings, admin, search |
| `web/components/` | cards (KnowledgeFeedCard, SkeletonCard), shared (Topbar, Bottombar, MainLayout, LeftSidebar, RightFilterPanel, ThemeToggle), ui (shadcn separator), OnboardingView, AdminGuard, theme-provider |
| `web/hooks/` | useFeedState (feed management + SSE + sessionStorage + scroll tracking + touch handlers) |
| `web/lib/` | api.ts (fetch wrapper + 401 auto-refresh interceptor), AuthContext, FilterContext, types, utils, domainMapping |

---

## Current Architecture Direction

Monorepo dengan pemisahan jelas antara backend API dan frontend Next.js:
- Backend: Express monolitik modular — 6 route module, logic di route handler (bukan service layer terpisah), RAG pipeline async via BullMQ worker
- Frontend: Next.js App Router, Client Components, REST API consumption via native fetch dengan cookie auth
- Komunikasi: REST API saja (versi `/api/v1/...` dan GraphQL belum diimplementasikan), cookie JWT auth, Next.js rewrites ke backend
- Pipeline: Selalu async via BullMQ (tidak ada sync fallback di refresh path). SSE path masih menjalankan pipeline in-process (satu-satunya pengecualian, dengan Redis lock untuk mencegah concurrent execution)

---

## Uncertainty Markers

- Assumption based on repository analysis: GitHub Actions CI/CD belum di-setup (file `.github/workflows/` ada tapi status pipeline tidak diketahui)
- Assumption based on repository analysis: MinIO container berjalan tapi belum ada integrasi aplikasi untuk avatar/static assets
- Assumption based on repository analysis: Cloudflare CDN disebut di arsitektur target tapi belum dikonfigurasi
- Assumption based on repository analysis: Monitoring (Prometheus+Grafana) dan structured logging (Loki) deferred ke Phase 2
- Assumption based on repository analysis: Read replica PostgreSQL belum diimplementasikan (single DB instance)
