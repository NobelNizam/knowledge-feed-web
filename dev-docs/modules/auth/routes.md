# Auth — Routes

| Method | Endpoint | Auth | Body | Response | Notes |
|--------|----------|------|------|----------|-------|
| POST | `/api/auth/register` | None (rate-limited) | `{ name, email, password }` | `{ success, user }` + set cookies | Password >= 8 chars, valid email |
| POST | `/api/auth/login` | None (rate-limited) | `{ email, password }` | `{ success, user }` + set cookies | Returns user minus password |
| POST | `/api/auth/logout` | None | — | `{ success }` | Delete session from DB, clear cookies |
| POST | `/api/auth/refresh` | None (cookie) | — (cookie: refreshToken) | `{ success }` + new access token cookie | Validates refresh token hash in DB |
| GET | `/api/auth/me` | Required | — | `{ success, data: user }` | Returns user + preferences + savedCards with interactions |

**File**: `backend/src/routes/auth.ts` (247 lines)
