# Database Architecture

> **Status:** DATA FILE — Update saat ada perubahan skema database.
> **Purpose:** Dokumentasi arsitektur database: koneksi, skema, relasi, storage.

---

## Connection Map

| Connection | Driver | Host | Schema | Notes |
|-----------|--------|------|--------|-------|
| `DATABASE_URL` | PostgreSQL (pgvector) | localhost:5432 (dev) / Neon serverless (production) | `knowledge_feed` | Primary DB — 11 model via Prisma, PGVector extension via raw SQL |
| `REDIS_URL` | Redis | localhost:6379 (dev) / Upstash (production) | db 0 | Cache + queue backend (BullMQ) |

---

## Migration Layout

| Path | Domain |
|------|--------|
| `backend/prisma/migrations/` | All migrations — Prisma auto-generate |
| `backend/prisma/schema.prisma` | Schema source of truth — 11 models |

---

## Models (11 Prisma Models)

| Model | Table | Purpose | Key Fields |
|-------|-------|---------|------------|
| KnowledgeCard | `knowledge_cards` | AI-generated content cards | title, content, domain, tags, engagementScore, moderationStatus, citations (JSON), sourceChunkIds, factChecked |
| User | `users` | Registered users | name, email (unique), password (bcrypt), role (USER/ADMIN), avatarUrl |
| Session | `sessions` | Refresh token persistence | refreshToken (SHA-256 hash, unique), userId, userAgent, ipAddress, expiresAt |
| UserPreferences | `user_preferences` | User domain preferences | domains (String[]), readingLevel |
| KnowledgeSource | `knowledge_sources` | arXiv paper metadata | externalId (unique), sourceType, title, authors[], abstract, contentHash (SHA-256 dedup), status |
| DocumentChunk | `document_chunks` | Text chunks + embeddings | content, chunkIndex, tokenCount, embedded flag, embedding column via raw SQL (vector(1024)) |
| FactCheckResult | `fact_check_results` | Claim verification | claim, verified, confidence, sourceType, sourceUrl |
| PipelineJob | `pipeline_jobs` | Pipeline execution tracking | bullmqJobId, type, status, input (JSON), output (JSON), currentStep, progress |
| Like | `likes` | Card likes | userId, cardId (unique composite) |
| Dislike | `dislikes` | Card dislikes | userId, cardId (unique composite) |
| View | `views` | Card view tracking | userId (nullable), cardId |
| Comment | `comments` | Card comments + replies | content, userId, cardId, parentId (self-referential) |
| Report | `reports` | User reports | reasons (String[]), userId, cardId (unique composite) |

---

## Key Indexes (Post-audit Fase 2)

| Index | Table | Purpose |
|--------|-------|---------|
| `@@index([domain, createdAt DESC])` | knowledge_cards | Feed query: `WHERE domain IN (...) ORDER BY createdAt DESC` |
| `@@index([createdAt, engagementScore DESC])` | knowledge_cards | Trending query: `WHERE createdAt >= 7d ORDER BY engagementScore DESC` |
| `@@index([moderationStatus])` | knowledge_cards | Moderation filter |
| `@@unique([sourceId, chunkIndex])` | document_chunks | Dedup per source |
| `@@unique([userId, cardId])` | likes, dislikes, reports | One interaction per user per card |
| `@@index([cardId])` | views, comments | Card detail queries |
| `@@index([userId])` | views | User view history |
| `@@unique([userId, cardId])` | views | Dedup per authenticated user |

---

## Cross-Database Relationship Style

Single database, no cross-DB queries. Semua relasi via Prisma foreign keys dengan `onDelete: Cascade`:
- Cascade delete: KnowledgeCard → likes, dislikes, views, comments, reports, factCheckResults
- Cascade delete: User → sessions, preferences, likes, dislikes, views, comments, reports
- Cascade delete: KnowledgeSource → DocumentChunk
- Cascade delete: Comment → replies (self-referential)

---

## Storage Implications

| Storage | Technology | Status | Notes |
|---------|-----------|--------|-------|
| Uploads | MinIO (S3-compatible) | Container running, not integrated | Planned for avatars, static assets |
| Database backups | `pg_dump` (logical) | Not automated yet | Daily dump to MinIO planned (retention 30 days) |
| WAL archiving | PostgreSQL WAL | Future | Point-in-time recovery |

---

## Operational Commands

| Domain | Command | Notes |
|--------|---------|-------|
| Migration | `npx prisma migrate dev --name init` | Development |
| Migration deploy | `npx prisma migrate deploy` | Production |
| Seed | `npx prisma db seed` | Via `tsx prisma/seed.ts` |
| Schema validate | `npx prisma validate` | CI check |
| Generate client | `npx prisma generate` | After schema change |
| PGVector setup | Raw SQL: `ALTER TABLE document_chunks ADD COLUMN embedding vector(1024)` | Manual after migration |
