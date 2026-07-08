# START_HERE

> **Status:** Onboarding entry point untuk AI agent baru.
> **Purpose:** Dibaca pertama kali saat onboarding. Berisi quick facts, reading order, dan safety notes.

---

## Quick Facts

| Item | Value |
|------|-------|
| Repository | `knowledge-feed-web` (monorepo) |
| Project Type | Fullstack (single git at root) |
| Git Location | Project root (`git` commands from root) |
| Stack | Backend: Express/TypeScript + Frontend: Next.js 14 + React 18 |
| DB | PostgreSQL 14 + PGVector |
| Cache / Queue | Redis 7 (cache + BullMQ) |
| Branch dev | `docs` (akan di-rename ke `dev`) |
| Branch main | Belum ada |
| Testing | Backend: Jest (29/29 pass), Frontend: 0 tests |

---

## Recommended Reading Order

Untuk memahami codebase ini, baca dengan urutan:

1. `PROJECT_CONTEXT.md` — Overview sistem dan stack (entry point terbaik)
2. `PROJECT_MENTAL_MODEL.md` — Cara berpikir tentang codebase ini
3. `MODULE_MAP.md` — Mapping modul ke kode aktual
4. `../architecture/api-flow.md` — Flow request dari browser ke response
5. `../architecture/backend-structure.md` — Struktur direktori backend
6. `../architecture/database.md` — Arsitektur database dan model
7. `../architecture/frontend-structure.md` — Struktur frontend dan komponen
8. `CODING_RULES.md` — Konvensi coding yang berlaku
9. `CURRENT_STATE.md` — Kondisi development terkini
10. `TASKS.md` — Task aktif dan prioritas
11. `KNOWN_ISSUES.md` — Issue yang diketahui dan belum difix
12. `TECHNICAL_DEBT.md` — Utang teknis dan risky areas
13. `VERSION.md` — Versi saat ini
14. `FINAL_SYSTEM_HANDOVER.md` — Ringkasan kondisi untuk handover
15. `../CHANGELOG.md` — Log perubahan kronologis
16. `../modules/` — Dokumentasi per modul (split-per-concern)

---

## High-Priority Current Work

- **O1** — Fix comment endpoint leaking `user.email` (PII leak ke publik)
- **O2** — Add CSRF Origin/Referer guard middleware untuk semua endpoint mutasi cookie-auth
- **Branch rename** — Rename branch `docs` → `dev` sebelum mulai pengembangan
- **O3** — Return 501 untuk admin placeholder endpoints (saat ini return sukses palsu)
- **Frontend tests** — Tambahkan minimal 1 unit test di frontend

---

## Safety Notes for Agents

- JANGAN commit ke branch `docs` sebelum rename ke `dev` — pastikan working tree bersih
- JANGAN jalankan `git init` di subfolder (backend/ atau web/) — git ada di root
- JANGAN ubah file di `ai-rules/` — itu immutable templates, hanya di-read
- JANGAN tulis credential/secret di file `.md` yang ada di folder kode (`backend/`, `web/`) — karena masuk git
- Pipeline dijalankan in-process di SSE path — hati-hati saat modifikasi `feed.ts:339-475`
- LLM JSON parsing di `aiGenerator.ts` fragile — setiap perubahan prompt harus di-test dengan beberapa topik berbeda
- Refresh token di-hash SHA-256 di DB — jika modifikasi auth flow, pastikan hash tetap digunakan
- Redis optional: semua fungsi cache aman jika Redis down (return null/false)
