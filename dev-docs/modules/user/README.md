# Module: User

| Item | Value |
|------|-------|
| State | Production |
| Route Prefix | `/api/user` |
| Middleware | `authMiddleware` (router-level — except public GET routes) |
| Dependencies | None |

## Purpose

Manajemen profil dan preferensi pengguna: update preferences (domains + reading level), save/unsave knowledge cards (denormalized saveCount), update profile (name + avatarUrl + bio), follow/unfollow users (toggle), public profile + follower/following lists.

## Quick Links

- Routes → [routes.md](./routes.md)
- Models → [models.md](./models.md)
