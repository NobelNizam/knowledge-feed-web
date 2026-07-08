# Module: User

| Item | Value |
|------|-------|
| State | Production |
| Route Prefix | `/api/user` |
| Middleware | `authMiddleware` (router-level — all routes) |
| Dependencies | None |

## Purpose

Manajemen profil dan preferensi pengguna: update preferences (domains + reading level), save/unsave knowledge cards (denormalized saveCount), update profile (name + avatarUrl).

## Quick Links

- Routes → [routes.md](./routes.md)
- Models → [models.md](./models.md)
