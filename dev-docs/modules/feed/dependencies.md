# Feed — Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| bullmq | 5.79 | Queue for async pipeline jobs |
| ioredis | 5.11 | Redis client (cache + queue backend) |
| jsonwebtoken | 9.0 | Optional JWT decode for user enrichment |

**Cache keys**:
- `feed:domain:{domain}` — Per-domain feed (domain = `__all__`, `Physics`, `multi:AI,Economics`, etc.)
- `feed:user:{userId}:*` — Legacy per-user cache (still invalidated on refresh)
- `feed:domain:*` — Pattern for global domain cache invalidation

**Lock keys**:
- `lock:refresh:user:{userId}` — Per-user Redis lock (NX, EX 60s) for SSE refresh
