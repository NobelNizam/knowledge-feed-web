# TASKS

> **Status:** DATA FILE — Update setiap task baru/selesai.
> **Purpose:** Daftar task aktif untuk milestone saat ini.

> **Anti-Monster Rule:** Hanya task AKTIF di sini. Done >1 minggu → [TASKS-ARCHIVE.md](./TASKS-ARCHIVE.md)

---

## Active Tasks

| Priority | ID | Status | Task | Repo | Notes |
|----------|----|--------|------|------|-------|
| P1 | O3 | Todo | Return 501 di admin placeholder endpoints | backend | `admin.ts:18,25` |
| P2 | TEST-FE | Todo | Tambahkan minimal 1 unit test frontend | frontend | `api.ts` interceptor atau `useFeedState` |
| P2 | O4 | Deferred | Implementasi tsvector full-text search | backend | Ganti ILIKE, tambah GIN index |
| P2 | O5 | Deferred | Refresh token rotation | backend | New session + delete old |
| P3 | O6 | Deferred | Move SSE pipeline ke worker process | backend | Redis pub/sub |
| P3 | O7 | Deferred | Soft delete for admin feed delete | backend | `deletedAt` column |

---

## Recently Done (<1 week)

| ID | Task | Completion Date | Notes |
|----|------|----------------|-------|
| O1 | Fix comment endpoint leaking `user.email` | 2026-07-08 | Hapus `email: true` dari 3 tempat select comments |
| O2 | Add CSRF Origin/Referer guard middleware | 2026-07-08 | `middleware/csrf.ts`, dipasang di `/api` |
| BRANCH | Rename branch `docs` → `dev` | 2026-07-08 | Branch renamed + committed dev-docs/

---

## Inferred Next Tasks

| Priority | Task | Reason |
|----------|------|--------|
| P1 | Verifikasi `npm run build` (frontend) | Status build tidak diketahui — mungkin ada error tersembunyi |
| P1 | Verifikasi `npm run lint` (frontend + backend) | Status lint tidak diketahui |
| P2 | Setup CI/CD GitHub Actions | Workflow file ada tapi status pipeline tidak jelas |
| P2 | Integrasi MinIO untuk avatar | Container sudah jalan, aplikasi belum pakai |
| P3 | Migrasi `console.*` ke `lib/logger.ts` | Logging inconsistency — pilih satu |

---

## Definition of Done for Current Milestone

**Milestone: Security Hardening (O1-O3 + Branch)**

- [x] (pending) O1 — Comment email PII leak fixed
- [x] (pending) O2 — CSRF middleware implemented
- [x] (pending) O3 — Admin placeholder return 501
- [x] (pending) Branch `docs` → `dev` renamed
- [x] (pending) All 29 backend tests still pass
- [x] (pending) `npm run build` + `npm run lint` frontend pass
