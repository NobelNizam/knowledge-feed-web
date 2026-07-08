# PROJECT_MENTAL_MODEL

> **Status:** DATA FILE — Update saat pola arsitektur fundamental berubah.
> **Purpose:** Cara berpikir tentang codebase ini — pola, filosofi, "mengapa"-nya.

---

## How to Think About This Codebase

Ini adalah platform konten AI-powered dengan dua sisi yang jelas: **backend Express yang menangani semua data + AI pipeline**, dan **frontend Next.js yang murni UI konsumsi API**. Tidak ada SSR data fetching di frontend — semua data masuk lewat `fetch` client-side dengan cookie auth. Backend adalah monolit modular: satu Express app dengan 6 route group, masing-masing menangani satu domain bisnis.

Pola paling penting: **semua konten berasal dari AI pipeline, bukan dari user**. User tidak membuat post — mereka hanya membaca, like, save, comment. AI pipeline adalah jantung sistem: cron job / manual trigger → BullMQ queue → 9-step RAG pipeline → knowledge card published.

---

## 1) Architecture Pattern

**Fullstack monorepo dengan single Git.** Backend dan frontend adalah dua aplikasi terpisah yang berkomunikasi via REST API.

- Backend: Express monolitik dengan route-based modularization. Tidak ada service layer terpisah — business logic ada di route handler. Pengecualian: `services/` untuk aiGenerator (kompleks), cacheService (Redis abstraction), domainHierarchy (topic mapping).
- Frontend: Next.js App Router, 100% Client Components. SPA-style navigation. State disimpan di React Context + sessionStorage.
- Pipeline: BullMQ worker process terpisah (jalan di proses yang sama via `createPipelineWorker()` di `index.ts`). Job dipicu via API endpoint atau CLI worker.
- Cache: Redis per-domain feed cache (key: `feed:domain:{domain}`), TTL 15 menit, invalidasi via SCAN pattern saat konten baru di-publish.

---

## 2) Request Execution Pattern

### Normal API Request
```
Browser → Next.js (rewrite /api/* → backend) → Express
  → helmet (security headers)
  → cors (origin check: localhost, FRONTEND_URL, *.trycloudflare.com dev only)
  → cookieParser
  → request logger (sanitize PII: password, token, email, name, text, comment)
  → rate limiter (global: 1000 req/15min)
  → route handler
    → auth middleware (JWT dari cookie `token` atau Authorization header)
    → business logic (Prisma queries)
    → JSON response
```

### Feed Refresh (SSE)
```
Browser → EventSource(/api/feed/refresh/sse)
  → auth middleware (wajib)
  → cek DB: ada kartu baru? → kirim langsung via SSE, selesai
  → tidak ada → Redis lock (NX, EX 60s, per-user)
    → lock gagal → kirim error "sedang berjalan", selesai
    → lock berhasil → executePipeline() in-process
      → crawl → clean → chunk → embed → vector store → retrieve → LLM generate → fact-check → moderate → publish
      → progress event via SSE setiap step
      → complete event dengan kartu baru
  → release Redis lock
```

### Pipeline (BullMQ Worker)
```
API trigger (POST /api/feed/refresh atau POST /api/generate)
  → createPipelineJob (DB record)
  → addPipelineJob (BullMQ queue)
  → return 202 Accepted

BullMQ Worker (pipelineWorker.ts)
  → ambil job dari queue
  → executePipeline():
    → updateProgress() ke DB + callback
    → crawl (arXiv API via fetch + xml2js)
    → clean (normalisasi teks, hapus LaTeX/HTML)
    → chunk (split per paragraf, estimasi token)
    → embed (NVIDIA NIM embedding API, 1024-dim)
    → vectorStore (PGVector insert via raw SQL)
    → retrieve (cosine similarity search, top-K chunks)
    → generateWithRAG (NVIDIA NIM LLM, context-aware prompt)
    → factCheck (CrossRef/PubMed API)
    → moderate (blacklist keywords, length validation, domain validation)
    → publish (DB insert + cache invalidate)
  → update job status completed
```

---

## 3) UI Pattern

- **Rendering**: 100% Client Components (`'use client'`). Tidak ada server-side data fetching. Halaman di-render kosong lalu diisi data via API client-side.
- **Layout**: `layout.tsx` → ThemeProvider → AuthProvider → Topbar + MainLayout({children}) + Bottombar. Sidebar kiri (LeftSidebar) dan panel filter kanan (RightFilterPanel) di-render di page komponen.
- **State Management**: React Context untuk auth (`AuthContext`) dan filter (`FilterContext`). Feed state via custom hook `useFeedState` yang mengelola cards, pagination, scroll position, dan SSE pipeline progress — state di-persist ke `sessionStorage` per tab/filter.
- **API Client**: `web/lib/api.ts` — wrapper `fetch` native dengan:
  - Auto JSON Content-Type header
  - Query params builder
  - 401 interceptor: auto-refresh via `POST /auth/refresh`, in-flight dedup (multiple 401 → 1 refresh call)
  - Cookie `credentials: 'include'`
- **Infinite Scroll**: Intersection Observer di `page.tsx` memicu `loadMore()` → `useFeedState.loadFeed()` → append cards.
- **Pull to Refresh**: Touch handlers di `useFeedState` → progress bar → triger SSE refresh jika pull >60%.

---

## 4) Data Migration/Import Mindset

Tidak ada migrasi dari sistem legacy. Data pipeline:
- arXiv API → raw XML → parsed → cleaned → chunked → embedded → PostgreSQL+PGVector
- PipelineJob menyimpan status setiap run (input, output, progress, error)
- KnowledgeSource menyimpan metadata paper (externalId, authors, abstract, URL, content hash untuk dedup)
- DocumentChunk menyimpan potongan teks (embedding via raw SQL, bukan Prisma)

---

## 5) Risk Hotspots

| Area | Risk | Reason |
|------|------|--------|
| `feed.ts:445` (SSE executePipeline) | HIGH | Pipeline 10-30 detik dijalankan in-process, block event loop. Redis lock mitigasi concurrent, tapi tetap single-thread bottleneck |
| `aiGenerator.ts:124-131` (LLM JSON parse) | MEDIUM | `match(/\[[\s\S]*\]/)` + `JSON.parse` — LLM output tidak terprediksi, bisa return markdown code block atau teks di luar array. Gagal parse = error. |
| `useFeedState.ts` (439 baris) | MEDIUM | Monolith hook: SSE events + sessionStorage + scroll tracking + touch gestures + countdown timer. Sulit di-test, sulit di-debug. |
| `knowledge.ts:417,454` (comment PII) | MEDIUM | GET/POST comments return `user.email` — email user terekspos ke publik via API |
| `publisher.ts:82-89` (content dedup) | LOW | Title+content exact match — bisa false positive jika dua paper bedah topik mirip |
| `vectorStore.ts` ($executeRawUnsafe) | LOW | Dimensi embedding di-interpolasi ke SQL string — saat ini aman (internal number 1024) |

---

## 6) Current Product Direction

- **Fase saat ini**: Phase 1-3 audit fixes selesai (29/29 tests). 6 open issues (O1-O7) tersisa.
- **Prioritas**: Security hardening (CSRF, PII leak) sebelum pengembangan fitur baru.
- **Next milestone**: Production-ready deployment (Vercel frontend + Render/Neon backend).
- **Jangka panjang**: Full-text search (tsvector), Knowledge Graph per-user, semantic vector search, refresh token rotation.
