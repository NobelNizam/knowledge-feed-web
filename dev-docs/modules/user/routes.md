# User — Routes

| Method | Endpoint | Auth | Body | Notes |
|--------|----------|------|------|-------|
| PUT | `/api/user/preferences` | Required | `{ domains[], readingLevel }` | Upsert UserPreferences. Valid levels: beginner, intermediate, advanced |
| POST | `/api/user/save` | Required | `{ cardId }` | Toggle save: connect/disconnect savedCards + increment/decrement saveCount |
| PUT | `/api/user/profile` | Required | `{ name, avatarUrl, bio }` | Update name (check duplicate, case-insensitive) + avatarUrl + bio |
| GET | `/api/user/:id` | Public | — | Public profile by user ID (no auth) |
| GET | `/api/user/:id/followers` | Public | — | List of followers for user |
| GET | `/api/user/:id/following` | Public | — | List of users that user follows |
| POST | `/api/user/:id/follow` | Required | — | Toggle follow: follow if not following, unfollow if already following |
| GET | `/api/user` | Required | — | Returns 501 Not Implemented (placeholder) |

**File**: `backend/src/routes/user.ts` (131 lines)
