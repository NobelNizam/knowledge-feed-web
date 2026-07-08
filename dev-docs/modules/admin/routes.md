# Admin — Routes

| Method | Endpoint | Auth | Body / Params | Notes |
|--------|----------|------|---------------|-------|
| POST | `/api/admin/pipeline/status` | Admin | `{ active }` | PLACEHOLDER (O3) — returns success without toggling |
| POST | `/api/admin/config/fact-check` | Admin | `{ config }` | PLACEHOLDER (O3) — returns success without updating |
| GET | `/api/admin/stats/users` | Admin | — | Working: totalUsers count + onlineUsers (sessions not expired) |
| DELETE | `/api/admin/feed/:id` | Admin | param: id | Hard delete KnowledgeCard + cascade. Invalidates domain cache. No soft delete (O7) |
| GET | `/api/admin/reports` | Admin | — | Working: all reports with reporter email + card info |
| DELETE | `/api/admin/reports/:id` | Admin | param: id | Working: dismiss report |

**File**: `backend/src/routes/admin.ts` (98 lines)
