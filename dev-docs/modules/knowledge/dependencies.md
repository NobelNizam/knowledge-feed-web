# Knowledge — Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| jsonwebtoken | 9.0 | Optional JWT decode for user context |
| crypto (Node.js stdlib) | — | SHA-256 hashing for anonymous view fingerprint |
| ioredis | 5.11 | Redis SETNX for anonymous view dedup |

**Env variables**:
- `ANON_VIEW_SALT` — Salt for hashing anonymous viewer fingerprints (default: `kf-anon-view`)
