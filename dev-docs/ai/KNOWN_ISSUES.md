# KNOWN_ISSUES

> **Status:** DATA FILE — Update saat ada issue baru atau terselesaikan.
> **Purpose:** Catatan issue yang diketahui — mencegah agent berikutnya mengulang debug yang sama.
> **Related:** [RESOLVED.md](./RESOLVED.md) untuk issue yang sudah fixed.

---

## Open Issues

| # | Area | Issue | Impact | Status |
|---|------|-------|--------|--------|
| O1 | `backend/src/routes/knowledge.ts:417,454` | GET + POST `/api/knowledge/:id/comments` mengembalikan `user.email` — PII leak ke publik via API | SEDANG | Todo |
| O2 | All POST/PUT/DELETE routes | Tidak ada CSRF Origin/Referer guard untuk cookie-auth mutating endpoints. Mitigasi parsial: `sameSite: 'lax'` | SEDANG | Todo |
| O3 | `backend/src/routes/admin.ts:18,25` | POST `/api/admin/pipeline/status` dan `/config/fact-check` return `{ success: true }` tanpa implementasi aktual | RENDAH | Todo |
| O4 | `backend/src/routes/knowledge.ts:49-57` | Search menggunakan `title: { contains: q, mode: 'insensitive' }` (ILIKE dengan leading wildcard) — tidak bisa pakai index, table scan saat data besar. tsvector full-text search belum diimplementasikan | RENDAH | Deferred |
| O5 | `backend/src/routes/auth.ts:190` | Refresh token tidak dirotasi — refresh token lama tetap valid 7 hari. Mitigasi: hash SHA-256 di DB (DB breach aman, cookie breach tidak) | RENDAH | Deferred |
| O6 | `backend/src/routes/feed.ts:445` | SSE refresh menjalankan `executePipeline()` in-process — block event loop 10-30 detik. Mitigasi: Redis lock per-user (hanya 1 concurrent). Upgrade path: Redis pub/sub worker terpisah | RENDAH | Acceptable (deferred) |
| O7 | `backend/src/routes/admin.ts:48` | `DELETE /api/admin/feed/:id` hard delete dengan cascade — tidak ada soft delete (`deletedAt`) atau audit trail | RENDAH | Deferred |

---

## Uncertainty Markers

- Assumption based on repository analysis: GitHub Actions CI/CD pipeline tidak aktif atau belum dikonfigurasi (file `.github/workflows/main.yml` perlu diverifikasi)
- Assumption based on repository analysis: `npm run build` di frontend belum pernah dijalankan/diverifikasi — status build tidak diketahui
- Assumption based on repository analysis: `next lint` belum pernah dijalankan — mungkin ada lint errors yang belum terdeteksi
- Assumption based on repository analysis: Registry container/package untuk Docker image belum di-setup (GitHub Container Registry atau Docker Hub)
