# ADR 005 — REST-Only API (No GraphQL)

## Status

Accepted (implemented)

---

## Context

ARCHITECTURE.md target menyebutkan "REST + GraphQL (feed queries)". Saat ini hanya REST yang diimplementasikan — tidak ada GraphQL endpoint. Perlu keputusan: apakah GraphQL perlu diimplementasikan, atau REST cukup.

Alternatif: implement GraphQL untuk feed queries (fleksibel, client bisa pilih field). Ditolak karena: menambah kompleksitas (schema, resolver, type generation), tidak ada kebutuhan client untuk custom field selection, feed query sudah sederhana (cards + pagination).

Alternatif: GraphQL sebagai satu-satunya API layer. Ditolak karena: REST sudah production, migrasi total berisiko, tidak ada permintaan user untuk GraphQL.

---

## Decision

Tetap REST-only:
- Semua endpoint di `/api/*` (no versioning like `/api/v1/` — deferred)
- Feed query via GET/POST dengan query params dan body JSON
- Tidak ada rencana jangka pendek untuk GraphQL
- Jika dibutuhkan nanti: tambahkan GraphQL sebagai layer terpisah, bukan pengganti REST

---

## Consequences

### Positive

- Simplicity — satu API style, mudah di-debug, tools standar (curl, Postman)
- Frontend sudah fully REST dengan typed API client (`api.ts`)
- Tidak ada overhead schema stitching atau N+1 resolver problem

### Trade-offs

- Over-fetching: feed response selalu mengembalikan semua field (tidak bisa custom selection)
- Under-fetching: card detail butuh multiple endpoints (card + comments) — 2 requests
- Tidak ada versioning (`/api/v1/`) — breaking changes akan sulit

### Risks

- Jika frontend butuh query yang lebih kompleks (nested resources, custom fields), REST menjadi tidak efisien
- API versioning harus diimplementasikan sebelum breaking changes pertama
