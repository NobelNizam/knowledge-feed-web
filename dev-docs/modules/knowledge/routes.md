# Knowledge — Routes

| Method | Endpoint | Auth | Params / Body | Notes |
|--------|----------|------|---------------|-------|
| GET | `/api/knowledge/search` | None | `?q&domain&limit` | ILIKE `title contains` — tsvector deferred |
| GET | `/api/knowledge/trending` | None | `?limit` (max 50) | Cards 7 hari terakhir, ORDER BY engagementScore DESC |
| GET | `/api/knowledge/domains` | None | — | GroupBy domain → return list |
| GET | `/api/knowledge/tags` | None | — | Distinct tags dari semua cards |
| GET | `/api/knowledge/:id` | Optional | — (param: id) | Parallel queries: card + likeCount + commentCount + dislikeCount + userLike + userDislike + userSaved |
| POST | `/api/knowledge/:id/like` | Required | — | Toggle: create/delete Like → update engagement score |
| POST | `/api/knowledge/:id/view` | Optional | — | Auth: create View if not exists. Anon: Redis SETNX dedup |
| POST | `/api/knowledge/:id/share` | None | — | Increment shareCount + update engagement score |
| POST | `/api/knowledge/:id/dislike` | Required | — | Toggle dislike, auto-delete like (mutual exclusive), auto-report on first dislike |
| POST | `/api/knowledge/:id/report` | Required | `{ reasons[] }` | Valid reasons: tidak akurat, bahasanya jelek, duplikat, error, tidak pantas |
| GET | `/api/knowledge/:id/comments` | None | — | Returns comments with nested replies. Includes user.email (O1 — PII leak) |
| POST | `/api/knowledge/:id/comments` | Required | `{ text, parentId? }` | Create comment or reply. Includes user.email in response (O1) |

**File**: `backend/src/routes/knowledge.ts` (466 lines)

**Engagement score formula**: `L*3 + D*(-3) + C*5 + V*1 + S*4`

**Anonymous view**: `sha256(salt + ip + ua + cardId)` → Redis SETNX TTL 24h → `isNewUniqueView = 'OK'`
