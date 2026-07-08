# Feed — Services

| Service | File | Purpose |
|---------|------|---------|
| Cache Service | `services/cacheService.ts` | Redis domain feed cache: `getDomainCache`, `setDomainCache`, `invalidateDomainCache`, `invalidateAllDomainCaches`, `invalidateUserCache`, `invalidateAllFeedCache`. SCAN-based key iteration, batch DEL 200. TTL: 900s (15 min). Max 150 items per cache entry. |
| Domain Hierarchy | `services/domainHierarchy.ts` | Topic mapping: `resolveFilterToTopics(type, value)` → `{ disciplines[], subtopicMap }`. `getAllLevel2()` → all allowed subdomains. `getLevel2ForLevel1(level1)` → subdomains under a main domain. |
| Pipeline Worker | `queue/workers/pipelineWorker.ts` | `executePipeline()` — orchestrates full RAG pipeline. `createPipelineWorker()` — BullMQ worker instance. |
