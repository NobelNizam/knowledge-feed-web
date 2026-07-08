# Generate — Routes

| Method | Endpoint | Auth | Body / Params | Notes |
|--------|----------|------|---------------|-------|
| POST | `/api/generate` | Admin | `{ topics[], count, async }` | Trigger pipeline. async=true → BullMQ → 202. async=false/queue fail → sync executePipeline |
| GET | `/api/generate/status/:jobId` | Required | param: jobId | Returns PipelineJob status, progress, input/output, error |
| GET | `/api/generate/stats` | Admin | — | Queue stats (waiting/active/completed/failed) + 10 recent jobs |
| GET | `/api/generate/sources` | Required | `?limit&offset` | Paginated list of KnowledgeSources with chunk count |

**File**: `backend/src/routes/generate.ts` (180 lines)
