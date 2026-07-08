# RESOLVED ISSUES

> **Status:** DATA FILE — Arsip issue yang sudah di-resolve.
> **Purpose:** Referensi historis — bermanfaat jika masalah serupa muncul lagi.

---

## Resolved (Onboarding, 2026-07-08)

| Date | Area | Issue | Fix |
|------|------|-------|-----|
| 2026-07 | `knowledge.ts:417,419,454` | Comment endpoints leak `user.email` di response publik | Hapus `email: true` dari select — ganti ke `{ id, name }` |
| 2026-07 | All POST/PUT/DELETE | No CSRF guard for cookie-auth mutations | `middleware/csrf.ts` — Origin/Referer header check against FRONTEND_URL |

## Resolved (Phase 1-3 Audit, 2026-07-06)

| Date | Area | Issue | Fix |
|------|------|-------|-----|
| 2026-07 | `feed.ts:260-511` | Auth gate missing pada refresh/SSE endpoints | `authMiddleware` di POST /refresh + GET /refresh/sse |
| 2026-07 | `feed.ts` | Redis lock bypass saat Redis null | Early return error jika `!redis` |
| 2026-07 | `feed.ts` | In-process pipeline di refresh sync | Selalu BullMQ async → return 202 Accepted |
| 2026-07 | `index.ts:36-38` | CORS `trycloudflare.com` di production | `isDev &&` gate, evil.com → 500 blocked |
| 2026-07 | `index.ts` | Trust proxy tidak diatur | `app.set('trust proxy', 1)` |
| 2026-07 | `index.ts:53` | Logging redact hanya password | 10 field PII/secrets di-redact via `sanitize()` |
| 2026-07 | `knowledge.ts:149-176` | `updateEngagementScore` N+1 | `count` + `findUnique(select)` bukan `include` |
| 2026-07 | `knowledge.ts:84-146` | Card detail 4 sequential query | `Promise.all` 1 round trip |
| 2026-07 | `cacheService.ts:75,98,119` | `redis.keys()` O(N) blocking | `scanStream` + batch DEL 200 |
| 2026-07 | `schema.prisma` | Missing DB indexes | Composite `(domain, createdAt DESC)` + `(createdAt, engagementScore DESC)` + FK indexes |
| 2026-07 | `knowledge.ts:226-285` | Anonymous view inflation | Redis SETNX SHA-256(ip+ua+cardId) TTL 24h |
| 2026-07 | `schema.prisma:82` | Refresh token plaintext di DB | SHA-256 hash → 64 hex chars di Session row |
| 2026-07 | `publisher.ts` | Domain LLM tidak divalidasi | `isAllowedDomain()` + fallback `"general"` |
| 2026-07 | All routes | `limit` query parameter unbounded | `clampLimit` 1..100 di semua endpoint |
| 2026-07 | `web/package.json` | Storybook/Vitest/Playwright dead deps | Semua dihapus dari dependencies |
| 2026-07 | `web/package.json` | `axios` dead dependency | Dihapus (semua pakai native `fetch`) |
| 2026-07 | `web/package.json` | `js-cookie` dead dependency | Dihapus (cookie via native `document.cookie`) |
| 2026-07 | `web/package.json` | `next@14.0.4` vulnerable | Upgrade ke `next@14.2.35` (0 vuln audit) |
| 2026-07 | `api.ts` | No auto-refresh interceptor | `tryRefresh()` 401→retry, in-flight dedup |
| 2026-07 | `backend/` root | `.env.example` missing | Dibuat (43 baris template), dihapus dari `.gitignore` |
| 2026-07 | `docker-compose.yml:21` | `REDIS_PORTS` typo | `${REDIS_PORTS:-6379:6379}` default |
| 2026-07 | `next.config.js:10` | Hardcode localhost | `API_UPSTREAM_URL` env-based |
| 2026-07 | Backend JS → TS | CommonJS JS vs ARCHITECTURE.md claim | Full TS migration (30 file), `tsc --noEmit` clean |
| 2026-07 | `ARCHITECTURE.md` | Documentation drift | Section 10 "Status Implementasi Aktual" — ground truth |
