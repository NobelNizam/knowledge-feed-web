# Module: Knowledge

| Item | Value |
|------|-------|
| State | Production |
| Route Prefix | `/api/knowledge` |
| Middleware | `authMiddleware` (like, dislike, report, comment) |
| Dependencies | Redis (anonymous view dedup) |

## Purpose

Mengelola knowledge cards: search, trending, list domains/tags, card detail, dan semua interaksi pengguna (like, dislike, view, share, report, comments). Termasuk anonymous view deduplication via Redis dan engagement score calculation.

## Quick Links

- Routes → [routes.md](./routes.md)
- Models → [models.md](./models.md)
- Dependencies → [dependencies.md](./dependencies.md)
