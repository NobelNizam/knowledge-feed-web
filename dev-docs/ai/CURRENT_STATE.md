# CURRENT_STATE

> **Status:** DATA FILE — Update setiap akhir task.
> **Purpose:** Single source of truth kondisi development terkini.
> **Related:** [TASKS.md](./TASKS.md) · [CHANGELOG.md](../CHANGELOG.md) · [VERSION.md](./VERSION.md)

---

## Snapshot

| Repo | Branch | Last Commit | Notes |
|------|--------|------------|-------|
| root (monorepo) | `dev` | `5a3eef0` | O1+O2 security fixes applied |

| Last Updated | 2026-07-08 |
| Updated By | AI (deepseek-v4-pro) |

---

## Recent Development Highlights

| Commit | Date | Summary |
|--------|------|---------|
| `a43ece7` | 2026-07 | Docker compose env vars + openssl in Dockerfile |
| `3f90a2c` | 2026-07 | linux-musl-openssl-3.0.x binary target for Prisma |
| `e43beef` | 2026-07 | Dislike + reporting system with engagement score |
| `122b20e` | 2026-07 | Content-based deduplication in publisher |
| `32ced73` | 2026-07 | Optimize RAG context budget calculation |
| `21fa220` | 2026-07 | Token-aware prompt truncation + domain validation |
| `6a29f59` | 2026-07 | Increased timeout + retry for NIM inference |
| `dd2b5ce` | 2026-07 | Fuzzy domain matching + enhanced JSON parsing |
| `fbca107` | 2026-07 | Standardize API response with ApiResponse interface |
| `6d2d287` | 2026-07 | TypeScript 6.0.3 upgrade |

---

## Module Maturity

| Module | Repo | State | Notes |
|--------|------|-------|-------|
| Auth | backend | Production | Email+password, JWT cookie, rate-limited |
| Auth | frontend | Production | Login, register, logout, auto-refresh interceptor |
| Feed | backend | Production | Redis-cached, BullMQ async refresh, SSE progress |
| Feed | frontend | Production | Infinite scroll, pull-to-refresh, filter tabs, onboarding |
| Knowledge | backend | Production | Search (ILIKE), trending, like/view/share/dislike/report/comment |
| Knowledge | frontend | Production | Card detail, comments, interactions |
| User | backend | Production | Preferences CRUD, save/unsave, profile update |
| User | frontend | Production | Profile, settings, saved cards |
| Admin | backend | Beta | User stats OK; pipeline/status + config/fact-check = placeholder (return success without implementation) |
| Admin | frontend | Production | Admin guard, reports inbox, delete feed |
| Pipeline | backend | Production | Full RAG: arXiv → embed → LLM → fact-check → moderate → publish |
| Queue | backend | Production | BullMQ + Redis, worker process, job tracking in DB |
| Search | backend | Production | ILIKE `title contains` (limited — tsvector deferred) |
| Search | frontend | Production | Keyword search with domain filter |

---

## Active Backlog (Non-Done Tasks)

| Priority | ID | Status | Task | Repo | Notes |
|----------|----|--------|------|------|-------|
| P0 | O1 | Todo | Fix comment endpoint leaking `user.email` | backend | PII exposure via public API |
| P0 | O2 | Todo | Add CSRF Origin/Referer guard middleware | backend | Cookie-auth mutating routes |
| P1 | O3 | Todo | Return 501 for admin placeholder endpoints | backend | False operational assurance |
| P2 | O4 | Todo | Implement tsvector full-text search | backend | Replace ILIKE, add GIN index |
| P2 | O5 | Todo | Rotate refresh token on `/auth/refresh` | backend | 7-day stolen cookie window |
| P2 | O6 | Todo | Move SSE pipeline to worker process | backend | Block event loop on refresh |
| P2 | O7 | Todo | Soft delete for admin feed delete | backend | No audit trail, hard cascade |
| P2 | — | Todo | Add frontend tests | frontend | 0 test files |

---

## Test / QA State

| Repo | Area | Coverage | Status |
|------|------|----------|--------|
| backend | unit tests | 29/29 pass (~3.5s) | Passing |
| backend | typecheck (`tsc --noEmit`) | clean | Passing |
| backend | lint | no eslint configured | N/A |
| frontend | unit tests | 0% (no test files) | Not Started |
| frontend | lint (`next lint`) | unknown | Unknown |
| frontend | build (`next build`) | unknown | Unknown |
| e2e | Playwright smoke test | 1 full flow | Passed (2026-07-06) |

---

## Important Nuance

- Branch saat ini `docs`, bukan `dev` atau `main` — perlu rename ke `dev` sebelum pengembangan lanjutan
- Pipeline worker diinisialisasi di `index.ts` sebagai proses in-process — bukan worker process terpisah. Graceful shutdown via `SIGTERM` handler
- `SESSION_SECRET` env bersifat optional (tidak menyebabkan crash jika tidak ada) — berbeda dengan `JWT_SECRET` dan `REFRESH_TOKEN_SECRET` yang wajib
- Next.js rewrites menggunakan `API_UPSTREAM_URL` env (dengan fallback `localhost:3001`) untuk proxy API ke backend
- MinIO container berjalan di Docker compose tapi belum ada kode aplikasi yang menggunakannya
- Refresh token di-hash SHA-256 di DB (aman dari DB breach) tapi tidak dirotasi (cookie breach masih berbahaya)
- Semua dead dependencies (axios, js-cookie, storybook, vitest, playwright) sudah dihapus dari `web/package.json`
