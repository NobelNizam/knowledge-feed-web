# Feed — Routes

| Method | Endpoint | Auth | Params / Body | Response | Notes |
|--------|----------|------|---------------|----------|-------|
| GET | `/api/feed` | Optional | `?limit&offset&domains&seenIds` | `{ success, data: cards, pagination }` | Redis-cached per domain, 15 min TTL |
| POST | `/api/feed/personalized` | Optional | `{ domains[], seenIds[] }` + `?limit&offset` | `{ success, data: cards, pagination }` | Sama seperti GET tapi dengan array domains di body |
| POST | `/api/feed/refresh` | Required | `{ filterType, filterValue }` | `{ success, jobId, bullmqJobId, sseUrl }` 202 | Trigger pipeline async via BullMQ. Map filter ke discipline list via domainHierarchy |
| GET | `/api/feed/refresh/sse` | Required | `?filterType&filterValue&seenIds` | SSE stream: start → progress… → complete/error | Cek DB dulu → Redis lock → executePipeline in-process |

**File**: `backend/src/routes/feed.ts` (477 lines)

**Key helpers**:
- `clampLimit(raw, max=100, fallback=20)` — trust boundary clamp
- `enrichCardInteractions(cards, userId)` — Promise.all: likes, dislikes, userLikes, userDislikes, comments, savedCards
- `populateCacheIfNeeded(domainTarget, domainFilter)` — lazy cache population
- `getUserId(req)` — decode JWT non-blocking
