# API / Request Flow Architecture

> **Status:** DATA FILE — Update saat ada perubahan middleware pipeline, API baru, atau request handling pattern.
> **Purpose:** Dokumentasi flow request dari client ke response.

---

## Web Request Flow

```
[Browser] → [Next.js dev/prod] → [rewrite /api/* → backend]
  → [Express] → helmet → cors → cookieParser → request logger → rate limiter
  → [Router] → authMiddleware (JWT cookie/header) → [Route Handler]
  → [Prisma] → [PostgreSQL] → [JSON Response] → [Next.js] → [Browser]
```

Detail middleware pipeline (berdasarkan `backend/src/index.ts:22-93`):
1. `trust proxy = 1` — untuk X-Forwarded-* headers (Cloudflare tunnel, nginx)
2. `helmet()` — security headers (CSP, HSTS, X-Frame-Options, dll)
3. `cors({ credentials: true })` — origin check: localhost, FRONTEND_URL, *.trycloudflare.com (dev only)
4. `express.json()` — body parser
5. `cookieParser()` — cookie parser
6. Request logger — sanitize PII fields (password, token, email, name, text, comment, content, dll)
7. Rate limiter — 1000 req/15min per IP (global `/api` prefix)

---

## Auth Flow

### Registration
```
POST /api/auth/register { name, email, password }
  → email format validation
  → password length >= 8
  → check duplicate email
  → bcrypt hash (rounds 10)
  → create User + UserPreferences
  → generateTokens() → JWT access (15m) + JWT refresh (7d, jti unique)
  → SHA-256 hash refreshToken → store in Session table
  → setTokenCookie(): httpOnly, secure (production/HTTPS), sameSite (none/lax)
  → 201 Created + user data
```

### Login
```
POST /api/auth/login { email, password }
  → find user by email
  → bcrypt compare
  → generateTokens() → set cookies
  → return user (minus password) + preferences
```

### Token Refresh
```
POST /api/auth/refresh (cookie: refreshToken)
  → jwt.verify(refreshToken, REFRESH_TOKEN_SECRET)
  → SHA-256 hash → find Session in DB
  → check expiry
  → issue new access token (15m) → set cookie
  → ponytail: refresh token tidak dirotasi (O5 — deferred)
```

### Logout
```
POST /api/auth/logout (cookie: refreshToken)
  → SHA-256 hash → delete Session from DB
  → clearCookie('token') + clearCookie('refreshToken')
```

---

## Feed Flow

### GET /api/feed
```
?limit=N&offset=N&domains=a,b&seenIds=x,y
  → clampLimit (1..100, default 20)
  → optional: decode JWT from cookie (non-blocking — user_id bisa null)
  → resolve domainFilter
  → getDomainCache(domainTarget) — Redis
  → cache hit → filter by excludeIds → enrich → return
  → cache miss → populateCacheIfNeeded (DB query + set cache) → enrich → return
  → enrichCardInteractions(): Promise.all([
      likes groupBy, dislikes groupBy, userLikes, userDislikes,
      comments groupBy, user savedCards
    ]) — 1 round trip DB
```

### POST /api/feed/refresh (Authenticated)
```
{ filterType, filterValue }
  → resolveFilterToTopics() — map filter ke discipline list
  → createPipelineJob(DB) → addPipelineJob(BullMQ) → 202 Accepted { jobId, bullmqJobId, sseUrl }
  → on queue error → 503 Service Unavailable
```

### GET /api/feed/refresh/sse (Authenticated, SSE)
```
?filterType&filterValue&seenIds
  → cek DB: ada kartu baru yg belum dilihat? → enriched cards via SSE 'complete', end
  → tidak ada → Redis lock (NX, EX 60s, per-user)
    → lock gagal → error event, end
    → lock berhasil → executePipeline(in-process, with progress callback)
      → progress events via SSE setiap step pipeline
      → complete: enriched published cards via SSE
    → release lock
```

---

## Mutation Flow (Like/View/Share/Dislike/Report/Comment)

### Like Toggle
```
POST /api/knowledge/:id/like (authenticated)
  → find card
  → findExisting like (userId, cardId)
  → exists → delete like (unlike)
  → not exists → create like
  → count likes → updateEngagementScore(cardId)
  → formula: L*3 + D*(-3) + C*5 + V*1 + S*4
```

### View Tracking
```
POST /api/knowledge/:id/view (optional auth)
  → authenticated: findExisting view → not exists → create view → isNewUniqueView = true
  → anonymous: markAnonymousViewIfNew(fingerprint)
    → Redis SETNX SHA-256(salt+ip+ua+cardId) TTL 24h
  → isNewUniqueView → increment viewCount → updateEngagementScore
```

### Comment
```
POST /api/knowledge/:id/comments (authenticated)
  → validate text not empty
  → optional: parentId validation
  → create comment (include user: {id, name, email})
  → updateEngagementScore
  → ponytail: response includes user.email (O1 — PII leak)
```

---

## Debug Flow (Local Environment)

- Backend log: `console.log` dengan timestamp + method + URL + sanitized body
- Error log: `console.error` dengan stack trace
- Prisma: query log via env `DEBUG=prisma:*` (tidak diaktifkan default)
- Frontend: browser DevTools Network tab + console.log di hooks
- No Telescope/Debugbar — backend tidak pakai framework PHP
