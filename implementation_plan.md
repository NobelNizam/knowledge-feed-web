# Phase 1 – MVP Implementation Plan

## Goal Description
Membangun MVP yang dapat digunakan: autentikasi email + password, timeline UI, AI post generation (NVIDIA NIM + simple RAG), pencarian kata kunci, bookmark & like, cache feed per‑user (Redis), dan backup harian ke MinIO.

## User Review Required
> [!IMPORTANT]
> Pastikan urutan sub‑agent yang diusulkan sesuai dengan prioritas Anda.  Sub‑agent dapat dijalankan paralel, namun beberapa dependensi (mis. database schema sebelum API) harus selesai terlebih dahulu.

## Open Questions
> [!NOTE]
> - Tidak ada pertanyaan terbuka untuk fase ini.

## Proposed Changes
---
### Sub‑Agent A – Auth Service
- Implementasi login / register (bcrypt, JWT, refresh token).
- Schema `users` dan tabel `sessions` di PostgreSQL.
- Unit test untuk endpoint `/api/login` & `/api/register`.

### Sub‑Agent B – Frontend Timeline
- Next.js pages: `/feed`, komponen infinite scroll, UI bookmark & like.
- Integrasi dengan API `/api/feed` (REST) dan GraphQL untuk query feed.
- Storybook demo komponen utama.

### Sub‑Agent C – AI Content Service (RAG Lite)
- Container GPU dengan NVIDIA NIM (model Mistral‑7B atau setara).
- Pipeline sederhana: Trusted Sources → Crawler (arXiv) → Cleaning → Chunk → Embedding → PGVector → Retriever → LLM → Fact‑Check (CrossRef, PubMed, arXiv) → Moderasi → Publish.
- Endpoint `/api/generate` yang dipanggil oleh backend saat feed refresh.

### Sub‑Agent D – Cache & Backup
- Redis cache per‑user (TTL 5 menit, invalidasi saat posting baru).
- Skrip backup harian PostgreSQL → MinIO (retention 30 hari).
- CI test untuk backup/restore.

### Sub‑Agent E – DevOps / CI‑CD
- GitHub Actions workflow: lint, unit tests, Docker build, deploy ke Vercel (frontend) & VPS (backend).
- Deploy otomatis pada merge ke `main`.
- **Pre‑load**: baca `docker-compose.yml` dan pastikan semua service (frontend, api, redis, postgres, minio) terdefinisi sebelum generate konfigurasi.

---
## Fallback Model Strategy
- **Primary model**: Gemini 3.1 Pro High (digunakan oleh semua sub‑agent).
- **Fallback**: Jika terjadi error fatal atau model tidak tersedia, otomatis beralih ke **Claude Opus 4.6**.
- Sub‑agent harus **menyimpan log terakhir** (thoughts, partial code, decisions) pada artifact `sub‑agent-<name>-log.md` sehingga fallback dapat **melanjutkan** dari titik terakhir.

## Verification Plan
### Automated Tests
- `npm test` untuk unit dan integration test pada semua layanan.
- Postman collection untuk endpoint kritikal (login, feed, generate).

### Manual Verification
- Register akun baru, login, dan pastikan timeline muncul.
- Klik “Generate AI post” dan verifikasi posting muncul di feed.
- Periksa cache Redis (TTL) dan backup di MinIO.
- Deploy ke Vercel dan pastikan semua layanan berfungsi di staging.

## Model Switching Implementation Note
- Pada setiap sub‑agent, wrap pemanggilan model dalam fungsi `runWithModel(primary, fallback)` yang menangkap exception, menulis ke log artifact, lalu memanggil fallback.

---
## Documentation Update
- Perbarui `ARCHITECTURE.md` dengan catatan fallback model dan kebutuhan `docker‑compose.yml`.
