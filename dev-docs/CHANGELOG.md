# CHANGELOG

> **Status:** DATA FILE — Update setiap milestone/sprint.
> **Purpose:** Log historis perubahan. Sumber input untuk rekomendasi versi di `dev-docs/ai/VERSION.md`.

---

## [Unreleased] — Current Sprint

### Added
- `dev-docs/` — dokumentasi development lengkap (PROJECT_CONTEXT, PROJECT_MENTAL_MODEL, MODULE_MAP, CODING_RULES, CURRENT_STATE, START_HERE, dll)
- `dev-docs/architecture/` — api-flow, backend-structure, database, frontend-structure
- `dev-docs/modules/` — dokumentasi per-modul untuk 7 modul (auth, feed, knowledge, user, admin, generate, pipeline)
- `dev-docs/ai/START_HERE.md` — onboarding entry point
- `dev-docs/ai/AGENTS.md` — repo-specific AI working contract

---

## [Pre-release] — 2026-07 (Audit Phase 1-3)

### Added
- Dislike + reporting system with engagement score adjustments
- Content-based deduplication in publisher (title+content exact match)
- Anonymous view deduplication (Redis SETNX SHA-256 fingerprint, 24h TTL)
- Admin dashboard: user stats, reports inbox, delete feed

### Changed
- Backend: Full TypeScript migration (30 JS files → TS, `tsc --noEmit` clean)
- Engagement score formula: `L*3 + D*(-3) + C*5 + V*1 + S*4`
- Redis: `KEYS` → `SCAN` iterator pattern for cache invalidation
- Refresh token: SHA-256 hashed in DB (was plain JWT)
- Trust proxy: `app.set('trust proxy', 1)` for TLS termination
- Request logger: 10 PII fields redacted (was password only)
- Feed query: composite DB indexes for domain+createdAt and trending queries
- Card detail: 4 sequential queries → 1 `Promise.all` round trip
- Limit clamping: `Math.min(n, 100)` at trust boundary for all endpoints

### Fixed
- Critical: CORS `.trycloudflare.com` gated to dev only
- Critical: Auth gate + always-async pipeline on refresh endpoints
- Critical: Redis lock bypass when Redis unavailable
- High: `updateEngagementScore` N+1 (include+length → count+findUnique)
- High: Anonymous view inflation (every request counted)
- High: LLM domain output validation before DB insert
- Medium: `docker-compose.yml` REDIS_PORTS default value
- Low: `next.config.js` hardcoded localhost → env-based API_UPSTREAM_URL

### Removed
- Dead dependencies from web/: axios, js-cookie, @types/js-cookie
- Dead devDependencies: @storybook/*, @vitest/*, vitest, playwright, vite, @chromatic-com/storybook
- `next.config.js` optimizeFonts: false (removed, Next.js default on)

### Security
- All critical Phase 1 findings fixed (CORS, auth gate, dead deps, next.js version)
- Refresh token SHA-256 hash in DB
- Request logger PII redaction (10 fields)
- Trust proxy for secure cookies behind TLS
- Clamped limit at all trust boundaries

---

## Archived Changelogs

- `CHANGELOG-2026.md` — Archive for 2026 entries (after year end)
