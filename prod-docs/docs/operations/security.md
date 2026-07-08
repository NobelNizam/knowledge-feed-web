# Security Configuration — Knowledge Feed Web

> **Last Updated:** 2026-07-08

---

## Active Security Measures

| Layer | Measure | Status |
|-------|---------|:---:|
| Auth | JWT access (15 min) + refresh (7 hari) HttpOnly cookies | Active |
| Auth | bcrypt password hashing (rounds 10) | Active |
| Auth | Refresh token SHA-256 hash di DB | Active |
| CSRF | Origin/Referer guard middleware | Active |
| Rate Limit | 1000 req/15min global, 10 req/15min auth | Active |
| Headers | helmet (CSP, HSTS, X-Frame-Options, etc.) | Active |
| CORS | Whitelist: bishamon.vercel.app only (production) | Active |
| PII | Request logger redact 10 fields | Active |
| Input | `clampLimit` di semua trust boundaries | Active |
| Proxy | `trust proxy = 1` untuk X-Forwarded-Proto | Active |
| Cookie | `secure: true`, `sameSite: none` (HTTPS) | Active |
| Deps | `npm audit --omit=dev`: 0 vulnerabilities | Active |

---

## Platform Security

| Platform | Security |
|----------|----------|
| Vercel | HTTPS auto, DDoS protection, environment variables encrypted |
| Render | HTTPS auto, private env vars, isolated containers |
| Neon | SSL-enforced connections (`?sslmode=require`), IP allowlist available |
| Upstash | TLS connections, token-based auth |

---

## Secrets Management

- Semua secrets di dashboard platform (Render, Vercel) — tidak di repo
- Generate unique per environment:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  # → JWT_SECRET, REFRESH_TOKEN_SECRET, SESSION_SECRET
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  # → ANON_VIEW_SALT
  ```
- `.env` tidak pernah di-commit (`.gitignore`)
- `.env.example` berisi placeholder (bukan nilai asli)
- `prod-docs/` di luar git repo — credential BOLEH ditulis di sini

---

## Known Gaps

| Issue | Severity | Mitigation |
|-------|----------|-----------|
| Refresh token not rotated | Low | SHA-256 hash di DB — cookie breach 7-day window |
| No 2FA | Low | Email+password only — acceptable MVP |
| No audit trail for admin deletes | Low | Hard delete without soft delete (O7) |
| SSE pipeline in-process | Low | Redis lock prevents concurrent execution |
