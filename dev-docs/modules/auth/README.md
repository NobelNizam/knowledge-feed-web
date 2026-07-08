# Module: Auth

| Item | Value |
|------|-------|
| State | Production |
| Route Prefix | `/api/auth` |
| Middleware | `authLimiter` (register/login: 10 req/15min), `authMiddleware` (GET /me) |
| Dependencies | `bcryptjs`, `jsonwebtoken`, `cookie-parser` |

## Purpose

Otentikasi dan manajemen sesi pengguna. Email+password registration with bcrypt hashing, JWT access token (15 min) + refresh token (7 hari) via HttpOnly cookies, SHA-256 hashed refresh token di DB. Rate-limited pada register dan login.

## Quick Links

- Routes → [routes.md](./routes.md)
- Models → [models.md](./models.md)
- Dependencies → [dependencies.md](./dependencies.md)
