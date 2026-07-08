# TECHNICAL_DEBT

> **Status:** DATA FILE — Update saat ada tech debt baru atau terselesaikan.
> **Purpose:** Inventaris utang teknis. Untuk sadar risiko, bukan untuk langsung diperbaiki.

---

## Priority Debt List

| Priority | Repo | Debt | Evidence | Suggested Direction |
|----------|------|------|----------|-------------------|
| P1 | frontend | 0 test coverage | Tidak ada file test di `web/` | Minimal: unit test untuk `api.ts` interceptor dan `useFeedState` hook. Gunakan Jest atau Vitest |
| P1 | frontend | `useFeedState.ts` 439 baris | Monolith hook: SSE + sessionStorage + scroll + touch + timer | Split jadi `useSSEPipeline` dan `useScrollState` saat testing dibutuhkan |
| P2 | backend | Pipeline import via `require()` with `any` cast | `pipelineWorker.ts` import pipeline module via `require()` — type safety hilang | Konversi pipeline module ke proper TypeScript import (pending BullMQ ioredis type conflict resolution) |
| P2 | backend | `aiGenerator.ts` LLM JSON parsing fragile | `match(/\[[\s\S]*\]/)` + `JSON.parse` — LLM output tidak terprediksi | Tambahkan Zod schema validation, retry dengan prompt correction, fallback generation |
| P2 | backend | `executePipeline` in-process di SSE path | Block event loop 10-30 detik, single-thread bottleneck | Pindahkan ke worker process dengan Redis pub/sub untuk SSE events |
| P2 | backend | Comment response leak `user.email` | `knowledge.ts:417,454` — `user: { select: { id, name, email } }` | Hapus `email` dari select — ganti dengan `{ id, name }` |
| P3 | backend | `enrichCardInteractions` masih hit count query | `feed.ts:34-62` — 6 parallel count/groupBy queries, bukan denormalized counters | Denormalisasi `likeCount` + `commentsCount` di KnowledgeCard, update atomik via increment/decrement |
| P3 | backend | No refresh token rotation | `auth.ts:190` — hanya issue access token baru, refresh token lama tetap valid | Create new session + new cookie + delete old session on each `/auth/refresh` call |
| P3 | backend | `$executeRawUnsafe` di `vectorStore.ts` | Dimensi embedding di-interpolasi ke SQL string — saat ini aman (internal number 1024) | Validasi dimensi sebagai finite number sebelum interpolasi |
| P3 | backend | Logger inconsistency | `lib/logger.ts` ada tapi semua route pakai `console.*` langsung | Pilih salah satu: migrasi semua ke logger, atau hapus `lib/logger.ts` |
| P3 | backend | Admin hard delete | `admin.ts:48` — `prisma.knowledgeCard.delete()` cascade hapus semua relasi | Tambah `deletedAt` column atau status `archived`, ganti jadi soft delete |
| P3 | frontend | Build/lint status unknown | Tidak ada CI pipeline yang terverifikasi | Jalankan `next lint` dan `next build`, catat status di CURRENT_STATE.md |
| P3 | infra | CI/CD pipeline status unknown | `.github/workflows/` ada tapi status tidak jelas | Audit workflow file, aktifkan jika perlu, catat di deployment docs |

---

## Risky Areas to Modify

| Area | Repo | Risk | Reason |
|------|------|------|--------|
| `feed.ts` SSE path (lines 339-475) | backend | HIGH | Redis lock + in-process pipeline execution — chain of dependencies (Redis, arXiv API, NIM API, DB). Modifikasi di sini bisa mempengaruhi reliability feed refresh |
| `aiGenerator.ts` LLM integration | backend | MEDIUM | Prompt engineering + JSON parsing + token budget — fragile, perubahan kecil di prompt bisa break output format |
| `publisher.ts` publishCard | backend | MEDIUM | Content dedup (false positive risk) + domain validation + DB insert — perubahan di sini mempengaruhi kualitas feed |
| `useFeedState.ts` | frontend | MEDIUM | Monolith hook — perubahan di sini mempengaruhi seluruh feed experience (scroll, SSE, cache) |
| `api.ts` fetch wrapper | frontend | MEDIUM | 401 interceptor + in-flight dedup — perubahan bisa break auth flow seluruh app |
| `pipelineWorker.ts` | backend | LOW | Orchestration 9-step pipeline — perubahan urutan step atau error handling bisa mempengaruhi pipeline completion |
| `index.ts` middleware pipeline | backend | LOW | Stack middleware diurutkan secara spesifik — perubahan urutan bisa mempengaruhi security/performa |

---

## Debt Acceptance Notes

- **Pipeline in-process di SSE**: Diterima untuk MVP karena single-user load dan Redis lock protection. Upgrade path jelas (Redis pub/sub worker).
- **ILIKE search**: Diterima untuk dataset kecil (<10K cards). Upgrade path jelas (tsvector GIN index).
- **No refresh token rotation**: Diterima karena refresh token sudah di-hash SHA-256 di DB. Cookie breach window 7 hari adalah trade-off yang diketahui.
- **Admin placeholder endpoints**: Diterima karena admin dashboard masih beta — mengembalikan sukses palsu lebih baik daripada crash, tapi harus diganti ke 501.
- **No frontend tests**: Diterima untuk MVP solo developer. Sebelum team scaling, wajib ada minimal unit tests.
- **Backend route handler logic tanpa service layer**: Diterima untuk ukuran file saat ini (rata-rata <500 baris per route). Jika route tumbuh >800 baris, extract ke service class.
