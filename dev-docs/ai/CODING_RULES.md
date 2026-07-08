# CODING_RULES

> **Status:** DATA FILE — Aturan coding yang SUDAH diterapkan di codebase ini.
> **Purpose:** Panduan konsisten untuk semua AI agent yang bekerja di repo ini.

---

## Part A — Backend Rules

### 1) Module and Route Conventions

- Satu file route = satu domain bisnis (`routes/auth.ts`, `routes/feed.ts`, dll)
- Route prefix: `/api/{module}` (didefinisikan di `index.ts`)
- Route file diexport dengan `export = router` (CommonJS compatibility)
- Tidak ada controller class terpisah — handler functions langsung di route file
- Shared helpers diekstrak ke fungsi internal di file route yang sama (contoh: `clampLimit`, `enrichCardInteractions`, `updateEngagementScore`)
- Middleware ditaruh di level route (import) atau router-level (`router.use(authMiddleware)`)
- Validasi input dilakukan inline di handler (tidak ada FormRequest atau DTO)
- Response format: `{ success: true, data: ... }` atau `{ error: 'message' }` dengan HTTP status code

### 2) Authorization Conventions

- **Auth**: `middleware/auth.ts` — JWT verification dari cookie `token` atau header `Authorization: Bearer ...`
- **Role**: `middleware/admin.ts` — cek `req.user.role === 'ADMIN'`
- Token: JWT access (15 min) + JWT refresh (7 hari) via HttpOnly cookies
- Refresh token: di-hash SHA-256 sebelum disimpan di `Session.refreshToken` (bukan plain JWT)
- Cookie config: `httpOnly: true`, `secure: true` (production/HTTPS), `sameSite: 'none'` (HTTPS) atau `'lax'` (HTTP dev)
- Middleware auth bisa dipasang per-route atau router-level (`router.use(authMiddleware)`)
- Role-based guard: adminMiddleware ditaruh setelah authMiddleware di route yang butuh admin

### 3) Data and Transaction Conventions

- **Pagination**: Semua endpoint yang menerima `limit` query parameter wajib di-clamp via `clampLimit(raw, max=100, fallback=20)` di trust boundary
- **Prisma singleton**: `lib/prisma.ts` menggunakan global singleton pattern (hindari multi-instance di dev hot reload)
- **Parallel queries**: Gunakan `Promise.all` untuk query independen (contoh: `enrichCardInteractions`, card detail)
- **Counting**: Gunakan `prisma.model.count()` atau `groupBy`, bukan `include` + `.length` (menghindari N+1)
- **Denormalization**: `saveCount` dan `dislikeCount` di KnowledgeCard — di-increment/decrement secara atomik. `likeCount` dan `commentCount` masih dihitung via count query
- **Engagement score**: Formula `L*3 + D*(-3) + C*5 + V*1 + S*4` — dihitung ulang setiap interaksi via `updateEngagementScore()`
- **Anonymous view dedup**: Redis SETNX SHA-256(salt + ip + ua + cardId) TTL 24h (bukan Postgres unique constraint)
- **Domain validation**: Output LLM divalidasi via `moderator.isAllowedDomain()` sebelum DB insert, fallback ke `"general"` jika tidak valid

### 4) Cache Conventions

- Redis key format: `feed:domain:{domain}` (domain feed), `feed:user:{userId}:*` (legacy), `view:anon:{hash}` (anonymous view)
- TTL: 15 menit untuk feed cache, 24 jam untuk anonymous view dedup
- Invalidation: SCAN iterator pattern (bukan `KEYS`), batch DEL 200 keys
- Cache population: lazy — diisi saat pertama kali diminta (`populateCacheIfNeeded`)
- Redis connection: optimistic — jika Redis down, semua cache function return null/false (tidak crash)

### 5) Pipeline Conventions

- Pipeline steps: sequential via `executePipeline()` → crawl → clean → chunk → embed → vectorStore → retrieve → generateWithRAG → factCheck → moderate → publish
- Setiap step update progress di DB (`PipelineJob`) via `updateProgress()`
- LLM integration: NVIDIA NIM via OpenAI-compatible SDK (`openai` npm package)
- Prompt: token-aware truncation (3000 chars max), context dari RAG retriever
- LLM output parsing: `match(/\[[\s\S]*\]/)` → JSON.parse, dengan fuzzy domain matching
- Publisher: dedup by title+content exact match, domain validation, citation deduplication

---

## Part B — Frontend Rules

### 6) UI Conventions

- **Component pattern**: PascalCase file names, default exports
- **Client Components**: Semua komponen yang pakai hooks/interactivity — tambahkan `'use client'` directive
- **Styling**: Tailwind utility classes + `cn()` helper (tailwind-merge + clsx) untuk conditional classes
- **shadcn/ui**: Komponen ada di `components/ui/` — gunakan variant API (`class-variance-authority`) untuk customisasi
- **Theme**: Dark mode via `next-themes` — class strategy, `dark:` prefix di Tailwind
- **Icons**: `lucide-react` — semua ikon dari library ini
- **Layout**: Shared components (Topbar, Bottombar, Sidebars) — komposisi di `layout.tsx` dan `MainLayout`
- **Forms**: Controlled components dengan React state, validasi inline, error message inline

### 7) API Conventions

- **Client**: `web/lib/api.ts` — wrapper `fetch` native
- **Auth**: Cookie `credentials: 'include'`, auto-refresh pada 401 via `tryRefresh()` dengan in-flight dedup
- **Endpoint grouping**: `authAPI`, `feedAPI`, `knowledgeAPI`, `userAPI`, `interactionAPI` — masing-masing punya method spesifik
- **Response type**: `ApiResponse` interface dengan optional `success`, `data`, `error`, `pagination`
- **Error handling**: Throw error dengan message dari response JSON — ditangkap di komponen dengan try/catch
- **SSE**: `EventSource` dengan `withCredentials: true` — event listeners: `start`, `progress`, `complete`, `error`

### 8) State Conventions

- **Global**: React Context (`AuthContext`, `FilterContext`) untuk state yang dibutuhkan banyak komponen
- **Page-level**: Custom hooks (`useFeedState`) untuk state spesifik halaman
- **Persistence**: `sessionStorage` untuk feed tab state dan scroll position (bukan `localStorage` — expire per session)
- **Cache validation**: Stale cache detection via domain list comparison (jika domain di cache tidak match dengan `DOMAIN_LEVEL2_MAP` → flush)
- **Optimistic updates**: Tidak diimplementasikan — UI menunggu response API sebelum update state

### 9) Testing Conventions

- **Backend**: Jest + ts-jest, 29/29 tests. File di `backend/src/tests/`. Naming: `{module}.test.js` dan `phase{N}.test.js`
- **Frontend**: Belum ada test. Rencana: Jest atau Vitest untuk unit test hook dan API client
- **Coverage**: Tidak ada target formal
- **Lint**: `next lint` (frontend), tidak ada ESLint di backend (dihapus)

### 10) Documentation Conventions

- Tidak ada JSDoc/TSDoc requirement
- Inline comment: gunakan `// ponytail: ...` untuk menjelaskan deliberate simplifications
- Semua dokumentasi development di `/dev-docs/` (AI-generated)
- CHANGELOG di `dev-docs/CHANGELOG.md`
