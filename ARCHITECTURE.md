# Wise Scrolling Platform Architecture

## AI-Powered Educational Social Platform

> **Visi**
>
> Membangun platform seperti Twitter/Threads yang mengubah *doom scrolling* menjadi *wise scrolling*, di mana pengguna tetap menikmati pengalaman scrolling namun seluruh kontennya merupakan hasil generasi AI yang berisi ilmu pengetahuan dari berbagai disiplin ilmu berdasarkan sumber terpercaya (*Single Source of Truth / SSOT*).

---

# 1. Tujuan Sistem

Platform memiliki karakteristik berikut:

* Timeline seperti Twitter/Threads
* Konten hanya berupa teks
* Seluruh posting dihasilkan AI
* Seluruh posting memiliki referensi terpercaya
* Pembelajaran berlangsung secara natural melalui scrolling
* Personalisasi berdasarkan minat pengguna
* Gratis dan dapat dikembangkan oleh solo developer

---

# 2. Arsitektur Tingkat Tinggi

```text
                         USER
                           │
                           ▼
                     Web Browser
                           │
                           ▼
                      Next.js Frontend (Vercel)
                           │
─────────────────────────┼──────────────────────────
                           │
                     Authentication
                           │
                           ▼
                    Backend API Server (Node.js/TS)
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    Feed Service     User Service    Search Service
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                   AI Content Service
                           │
─────────────────────────┼──────────────────────────
                           │
                     Knowledge Pipeline
                           │
      Trusted Sources → Cleaning → Chunk → Embed → Vector Store → RAG → LLM → Fact‑Check → Moderation → Publish
                           │
                     PostgreSQL Database
                           │
           Redis Cache + MinIO Object Storage
                           │
─────────────────────────┼──────────────────────────
                           │
         Monitoring • Logging • Backup • CI/CD (GitHub Actions)
```

---

# 3. Layer Architecture

## Layer 1 — Presentation Layer

**Fungsi**
* Menampilkan timeline
* Infinite scrolling
* Login (Email & Password)
* Profile
* Search (keyword)
* Bookmark
* Like
* Comment

**Tech Stack**
* Next.js (deployed on Vercel)
* React
* Tailwind CSS
* TypeScript

---

## Layer 2 — Authentication & Authorization

**Authentication**
* Email + Password (bcrypt hashed)
* Session stored in HttpOnly cookies, JWT access token (15 min) + refresh token (7 days)

**Authorization**
* Role‑based: User, Admin
* Admin capabilities:
  - Meng‑aktifkan/menonaktifkan pipeline AI
  - Mengatur konfigurasi fact‑check atau sumber terpercaya
  - Melihat jumlah akun user yang terbuat dan jumlah online
  - Menghapus konten feed tertentu
  - Melihat inbox report dari user untuk investigasi keluhan user

---

## Layer 3 — API Layer

* REST + GraphQL (feed queries)
* Versioned `/api/v1/...`

---

## Layer 4 — Business Logic

* Generate feed (cached per‑user)
* Ranking & recommendation (simple collaborative + knowledge‑graph based)
* Learning engine (track reading history, build personal knowledge graph)
* Like, Bookmark, Follow, Comment
* Search (keyword based on PostgreSQL full‑text)

---

## Layer 5 — AI Content Layer

* Open‑source LLM via NVIDIA **NIM** (model chosen based on availability, e.g., Mistral‑7B)
* Prompt templates include citation placeholders
* Retrieval‑Augmented Generation using PGVector embeddings
* Fact‑Check using CrossRef, PubMed, arXiv, official documentation, scientific journals
* Fully automated moderation (toxicity classifier, policy rules)
* Publish verified post to feed

---

## Layer 6 — Knowledge Pipeline (SSOT)

* **Trusted Sources**: Paper ilmiah, buku, dokumentasi resmi, organisasi internasional, pemerintah, universitas, arXiv, CrossRef, PubMed
* **Pipeline**:
  ```
  Trusted Sources → Crawler/API → Cleaning → Deduplicate → Chunking → Embedding → Vector Store (PGVector) → Retriever → Context Builder → LLM → Fact‑Check → Moderation → Publish
  ```
* All processing runs asynchronously via **BullMQ** queue workers

---

## Layer 7 — Database Layer

* PostgreSQL (primary + read replica for scaling)
* Schemas: users, profiles, posts, post_versions, likes, bookmarks, comments, follows, learning_progress, knowledge_graph, audit_log
* ORM: Prisma
* Vector extension: PGVector for embeddings

---

## Layer 8 — Search Layer

* Keyword search using PostgreSQL full‑text search (tsvector)
* Future road‑map includes semantic vector search

---

## Layer 9 — Cache Layer

* Redis (per‑user feed cache, session store, rate‑limit counters)
* TTL 5 minutes for feed, refresh on new post generation

---

## Layer 10 — Queue Layer

* BullMQ (Redis‑backed) for background jobs:
  * Content generation
  * Fact‑check
  * Moderation
  * Notification dispatch

---

## Layer 11 — Object Storage

* MinIO (S3‑compatible) for avatars, static assets

---

## Layer 12 — CDN

* Cloudflare (free tier) for static asset delivery

---

## Layer 13 — Monitoring

* **Tidak diperlukan** pada tahap MVP; akan ditambahkan pada fase Production Ready

---

## Layer 14 — Logging

* **Tidak diperlukan** pada tahap MVP; akan ditambahkan pada fase Production Ready

---

## Layer 15 — Deployment

* **Vercel** untuk Next.js Frontend (auto‑scaling, global edge)
* Docker containers for backend API, AI service, and queue workers (deployed via GitHub Actions to Vercel Serverless Functions or a low‑cost VPS if needed)
* CI/CD pipeline (GitHub Actions) runs lint, unit tests, builds Docker images, pushes to GitHub Container Registry, and deploys automatically on merge to `main`

---

## Layer 16 — Backup & Recovery

* Daily logical dump of PostgreSQL stored in MinIO (retention 30 days)
* WAL archiving optional for point‑in‑time recovery (future enhancement)

---

# 4. Infrastruktur (Infrastructure Architecture)

```text
Developer
   ↓
Git
   ↓
GitHub
   ↓
GitHub Actions
   ↓
Docker Build
   ↓
Vercel (Frontend) & VPS/Serverless (Backend)
   ↓
Nginx (optional reverse proxy for API)
   ↓
PostgreSQL & Redis
   ↓
MinIO Object Storage
   ↓
Monitoring (future)
```

---

# 5. AI Knowledge Pipeline (Inti Platform)

```text
Trusted Sources → Crawler/API → Cleaning → Deduplicate → Chunk → Embed → Vector Store → Retriever → Context Builder → LLM (NVIDIA NIM) → Fact‑Check (CrossRef, PubMed, arXiv) → Moderation → Publish
```

---

# 6. Learning Engine (Pembeda Utama)

* Membangun **Knowledge Graph** pribadi tiap pengguna berdasarkan riwayat membaca
* Menghubungkan topik terkait, menyesuaikan tingkat kesulitan, dan menerapkan *spaced repetition*
* Rekomendasi topik lanjutan berdasarkan progress graph

---

# 7. Rekomendasi Tech Stack (100 % Gratis & Open Source)

## Frontend
* Next.js (Vercel)
* React
* Tailwind CSS
* TypeScript

## Backend
* Node.js + TypeScript (API Routes)
* Prisma ORM
* BullMQ (queue)
* Redis
* PostgreSQL + PGVector
* MinIO (object storage)
* Nginx (reverse proxy, optional)

## AI
* Open‑source LLM via NVIDIA NIM (GPU container)
* Embedding models (sentence‑transformers) running on same GPU pool

## DevOps
* GitHub Actions CI/CD
* Docker
* Vercel for frontend, Serverless/VPS for backend

---

# 8. Tahapan Pengembangan (Roadmap)

## Phase 1 — MVP
* Authentication (email & password)
* Timeline UI
* AI Post generation (NIM LLM, simple RAG)
* Keyword Search
* Bookmark & Like
* Per‑user feed cache (Redis)
* Daily backup to MinIO

**Target:** Membuat aplikasi yang sudah dapat digunakan.

---

## Phase 2 — Production Ready
* Redis cache layer (enhanced TTL & eviction policies)
* Docker containerisation for all services
* CI/CD with automated tests, linting, security scans
* Monitoring (Prometheus + Grafana) & Logging (Loki) – optional but recommended for production
* Backup strategy refinement (WAL archiving)

---

## Phase 3 — Intelligent Platform
* Full Knowledge Pipeline with deduplication & chunking
* Advanced RAG + Fact‑Check integration (CrossRef, PubMed, arXiv)
* Knowledge Graph based learning engine
* Semantic search (vector search) – future enhancement

---

## Phase 4 — Scalability
* Queue scaling (multiple BullMQ workers on GPU nodes)
* CDN for static assets (Cloudflare)
* Load balancer & horizontal scaling of API services
* Multi‑region deployment (Vercel edge, optional backend regions)

---

# 9. Catatan Penting

Secara teknis, proyek ini **sangat memungkinkan** dikerjakan oleh seorang solo full‑stack developer dengan memanfaatkan teknologi open source dan layanan gratis untuk tahap awal. Tantangan terbesar tetap pada kualitas konten AI; prioritas utama adalah membangun **Knowledge Pipeline** yang kuat, melakukan fact‑check, dan mengembangkan **Knowledge Graph** untuk personalisasi belajar adaptif.

---

# 10. Status Implementasi Aktual (ground truth)

> Dokumen bagian 1–9 adalah *target arsitektur*. Bagian ini mencerminkan **apa yang benar‑benar berjalan di kode** per `AUDIT.md` (2026‑07). Update ketika ada perubahan material.

## Yang sudah jalan
| Area | Realita |
|------|---------|
| Frontend | Next.js 14.2.35 + React 18 + TypeScript + Tailwind. `web/lib/api.ts` pakai `fetch` native, `credentials: include` untuk cookie auth, 401→`/auth/refresh`→retry interceptor. Rewrites pakai `process.env.API_UPSTREAM_URL` (fallback `localhost:3001`). |
| Backend runtime | Node.js 22 + **TypeScript** (`backend/tsconfig.json` strict, `allowJs: true`, `noEmit: true`, runtime `tsx`). 30 file JS dikonversi ke TS. |
| API style | REST only di `/api/*` (no versioning, no GraphQL). |
| Auth | Email+password (bcrypt rounds 10), JWT access 15 min + refresh 7 hari. Refresh token **di-hash** SHA‑256 di `Session.refreshToken`. `/api/feed/refresh` + `/api/feed/refresh/sse` wajib auth; pipeline selalu lewat BullMQ (202 Accepted), `executePipeline` in‑process sudah dihapus dari path ini. |
| Security | `app.set('trust proxy', 1)`, CORS `localhost`+`trycloudflare.com` (dev only), `helmet`, request logger me-redact `password`/`token`/`email`/`name`/`text`/`comment`/dsb. |
| Data plane | PostgreSQL 14 + PGVector, Prisma 5.7, Redis 7. MinIO container jalan tapi **belum dipakai** aplikasi. |
| Queue / worker | BullMQ 5.79 di atas Redis. Worker di `backend/src/queue/workers/pipelineWorker.ts`, Redis lock fail‑closed di SSE refresh. |
| Pipeline | Crawler (arXiv) → Cleaner → Chunker → Embedder (NIM embed) → Vector store → Retriever → LLM (NIM) → Fact‑check → Moderator → Publisher. Domain output LLM divalidasi via `isAllowedDomain()`, fallback `"general"`. |
| Cache | Redis per‑domain feed cache, TTL 15 min. SCAN‑based invalidation (no `KEYS`). |
| Anonymous view dedup | Redis SETNX 24h TTL pada `sha256(salt+ip+ua+cardId)`. |
| Indexes | Composite `(domain, createdAt DESC)`, `(createdAt, engagementScore DESC)`, plus `cardId`/`userId` di views/comments. |
| Search | `title contains` ILIKE (single column, leading wildcard — limit di-clamp 100). tsvector **belum** diimplementasikan. |
| Limit clamping | `Math.min(parseInt(limit) || 20, 100)` di trust boundary untuk semua endpoint yang menerima `limit` (feed, knowledge, generate). |
| Engagement N+1 | `updateEngagementScore` pakai 3 query paralel (`findUnique`+`count`+`count`), bukan `include`+`length`. `GET /:id` pakai 1 round trip (Promise.all). |
| Tests | `backend/src/tests/{auth,feed,phase1,phase2,phase3}.test.js` — 29/29 pass via `ts-jest`. Frontend belum punya test. |
| Container | `docker-compose.yml` punya `${REDIS_PORTS:-6379:6379}` default, bukan bare `${REDIS_PORTS}`. |
| Dead deps | `axios`, `js-cookie`, `@types/js-cookie`, semua `@storybook/*`, `@chromatic-com/storybook`, `@vitest/*`, `vitest`, `playwright`, `vite` sudah dihapus dari `web/package.json`. |

## Belum jalan / roadmap
* GraphQL endpoint, `/api/v1/...` versioning
* Read replica, multi‑region deployment
* MinIO (object storage untuk avatar) — service jalan, integrasi belum
* Cloudflare CDN (saat ini cuma tunnel untuk dev)
* Prometheus + Grafana, Loki logging terstruktur
* Knowledge graph per user, spaced repetition, semantic vector search
* tsvector full‑text search (GIN index) — saat ini `title contains` ILIKE dengan leading wildcard
* Refresh token rotation on `/auth/refresh` (saat ini refresh token lama tetap valid sampai expiry)
* Soft delete + audit trail untuk admin `DELETE /admin/feed/:id`
* Denormalized `likeCount`/`commentsCount` di KnowledgeCard (saat ini hit count query, masih O(1) via Phase 2.13 tapi bisa di‑drop kalau traffic tinggi)
* CSRF middleware (audit #3.5 masih open — Origin/Referer guard untuk mutating routes)

## Verifikasi runtime (2026‑07‑06)
* Backend boot via `tsx src/index.ts` clean, pipeline worker start, Redis connect
* 12 endpoint di‑smoke via curl, semua expected status code
* Playwright E2E: login → onboarding → feed → like → card detail → search → save → profile
* 0 console error di browser, 0 error/warning di backend log (selain React DevTools recommendation)
* Bug yang ditemukan saat runtime: `REFRESH_TOKEN_SECRET` env name di‑rename ke `JWT_REFRESH_SECRET` saat TS migration, server crash. Fix: revert env name + `SESSION_SECRET` jadi optional.
