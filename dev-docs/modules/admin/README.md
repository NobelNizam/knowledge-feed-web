# Module: Admin

| Item | Value |
|------|-------|
| State | Beta |
| Route Prefix | `/api/admin` |
| Middleware | `authMiddleware` + `adminMiddleware` (router-level — all routes require ADMIN role) |
| Dependencies | `services/cacheService.ts` |

## Purpose

Dasbor administrator: toggle AI pipeline, konfigurasi fact-check, statistik pengguna, hapus konten feed, dan kelola report dari pengguna. Beberapa endpoint masih placeholder (O3 — return sukses tanpa implementasi).

## Quick Links

- Routes → [routes.md](./routes.md)
- Dependencies → [dependencies.md](./dependencies.md)
