# Generate — Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| bullmq | 5.79 | Queue system for async pipeline jobs |
| ioredis | 5.11 | Redis client |

**Related modules**:
- `queue/queueManager.ts` — Queue setup (getQueue, addPipelineJob, getQueueStats)
- `queue/workers/pipelineWorker.ts` — `executePipeline()` orchestrator
- `pipeline/publisher.ts` — `createPipelineJob()` DB record

**Known issue**: `GET /status/:jobId` tidak admin-only — authenticated user bisa baca job user lain (minor info leak).
