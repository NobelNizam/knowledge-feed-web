# User — Routes

| Method | Endpoint | Auth | Body | Notes |
|--------|----------|------|------|-------|
| PUT | `/api/user/preferences` | Required | `{ domains[], readingLevel }` | Upsert UserPreferences. Valid levels: beginner, intermediate, advanced |
| POST | `/api/user/save` | Required | `{ cardId }` | Toggle save: connect/disconnect savedCards + increment/decrement saveCount |
| PUT | `/api/user/profile` | Required | `{ name, avatarUrl }` | Update name (check duplicate, case-insensitive) + avatarUrl |
| GET | `/api/user` | Required | — | Returns 501 Not Implemented (placeholder) |

**File**: `backend/src/routes/user.ts` (131 lines)
