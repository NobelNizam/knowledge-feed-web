# TASKS

> **Status:** DATA FILE — Update setiap task baru/selesai.
> **Purpose:** Daftar task aktif untuk milestone saat ini.

> **Anti-Monster Rule:** Hanya task AKTIF di sini. Done >1 minggu → [TASKS-ARCHIVE.md](./TASKS-ARCHIVE.md)

---

## Active Tasks

| Priority | ID | Status | Task | Repo | Notes |
|----------|----|--------|------|------|-------|
| P2 | O4 | Deferred | Implementasi tsvector full-text search | backend | Ganti ILIKE, tambah GIN index |
| P2 | O5 | Deferred | Refresh token rotation | backend | New session + delete old |
| P3 | O6 | Deferred | Move SSE pipeline ke worker process | backend | Redis pub/sub |
| P3 | O7 | Deferred | Soft delete for admin feed delete | backend | `deletedAt` column |

---

## Recently Done (<1 week)

| ID | Task | Completion Date | Notes |
|----|------|----------------|-------|
| O3 | Return 501 di admin placeholder endpoints | 2026-07-08 | `admin.ts:18,25` |
| LINT | Setup ESLint + fix 3 lint errors, pin deps | 2026-07-08 | `eslint@8` + `eslint-config-next@14`, lint 0 errors |
| BUILD | Verify `next build` production | 2026-07-08 | 10/10 pages, 87.3 kB shared |
| O1 | Fix comment endpoint leaking `user.email` | 2026-07-08 | Hapus `email: true` dari 3 tempat select comments |
| O2 | Add CSRF Origin/Referer guard middleware | 2026-07-08 | `middleware/csrf.ts`, dipasang di `/api` |
| BRANCH | Rename branch `docs` → `dev` | 2026-07-08 | Branch renamed + committed dev-docs/ |

---

## Inferred Next Tasks

| Priority | Task | Reason |
|----------|------|--------|
| P1 | Buat branch `main` dari `dev` | Konvensi ai-rules — butuh branch stabil |
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
