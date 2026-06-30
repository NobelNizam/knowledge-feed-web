# Security Review

Status: post quick hardening pass.

## Fixed

- JWT prod fallback secrets removed; missing `JWT_SECRET` / `REFRESH_TOKEN_SECRET` now fails fast.
- POST password logging redacted.
- PrismaClient duplication replaced with shared singleton.
- `web/.next/*` untracked; `.gitignore` covers build artifacts.
- Backend prod dependency audit: 0 vulnerabilities.

## Findings, priority order

### 1. Critical: vulnerable Next.js

`web` uses `next@14.0.4`; `npm audit --omit=dev` reports critical/high advisories.

Fix:

```bash
cd web
npm install next@14.2.35
npm run build
```

### 2. CSRF risk: cookie auth + `sameSite: lax`

Cookie-authenticated mutating endpoints accept browser cookies without CSRF/origin guard:

- `/api/user/preferences`
- `/api/user/save`
- `/api/knowledge/:id/like`
- `/api/knowledge/:id/comments`
- `/api/generate/*`
- `/api/admin/*`

Fix: for non-GET/HEAD/OPTIONS, require `Origin` or `Referer` host to match `FRONTEND_URL`.

### 3. Public expensive endpoint

`POST /api/feed/refresh` is unauthenticated and runs the AI pipeline synchronously.

Impact: cost abuse / DoS.

Fix: require auth; ideally admin-only or stricter per-user/IP rate limit.

### 4. CORS dev shortcut too broad

`backend/src/index.js` allows all origins when `NODE_ENV=development`.

Impact: unsafe if deployed with wrong env.

Fix: explicit allowlist only; no blanket dev allow in shared server code.

### 5. Public PII leak in comments

`backend/src/routes/knowledge.js` returns user emails with comments/replies/created comment.

Fix: select only `{ id, name }` for public comment users.

### 6. Refresh token not rotated

`/api/auth/refresh` reuses the same refresh token until expiry/logout.

Impact: stolen refresh cookie remains usable.

Fix: on refresh, create new refresh token/session, delete old session, set both cookies.

### 7. Access token remains valid after logout

Logout deletes refresh session only. Access token remains valid until 15-minute expiry.

Status: acceptable for MVP; add denylist only for high-risk requirements.

### 8. Input limits weak

Missing/weak caps:

- comment text length
- `limit` query params
- `domains` / `seenIds` array length
- `/api/generate` `count`

Fix: clamp at trust boundary.

### 9. Raw SQL unsafe pattern

`backend/src/pipeline/vectorStore.js` uses `$executeRawUnsafe` / `$queryRawUnsafe`.

Current inputs are mostly internal numeric vectors, so immediate risk is low.

Fix: validate vector arrays as finite numbers, clamp `topK`, clamp dimension.

### 10. Admin placeholder endpoints return success

`/api/admin/pipeline/status` and `/api/admin/config/fact-check` return success but do not apply changes.

Impact: false operational assurance.

Fix: return `501 Not Implemented` until implemented.

## Minimum next patch

1. Upgrade Next.js to `14.2.35`.
2. Add CSRF origin guard middleware.
3. Auth-gate `/api/feed/refresh`.
4. Remove emails from public comment responses.
5. Clamp `limit`, `count`, comment length, array params.
