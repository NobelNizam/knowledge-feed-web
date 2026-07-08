# Auth — Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| bcryptjs | 3.0 | Password hashing (rounds 10) |
| jsonwebtoken | 9.0 | JWT sign/verify |
| cookie-parser | 1.4 | Cookie parsing middleware |
| express-rate-limit | 8.5 | Auth rate limiter (10 req/15min) |
| crypto (Node.js stdlib) | — | Random bytes untuk jti, SHA-256 hash untuk refresh token |

**Env variables**:
- `JWT_SECRET` (wajib) — Access token signing
- `REFRESH_TOKEN_SECRET` (wajib) — Refresh token signing
- `SESSION_SECRET` (optional) — Cadangan, tidak digunakan saat ini
