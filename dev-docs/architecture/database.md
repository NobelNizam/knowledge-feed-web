# Database Architecture

> **Status:** DATA FILE — Update saat ada perubahan skema database.
> **Purpose:** Dokumentasi arsitektur database: koneksi, skema, relasi, storage.

---

## Connection Map

| Connection | Driver | Host | Schema | Notes |
|-----------|--------|------|--------|-------|
| `DATABASE_URL` | PostgreSQL (pgvector) | localhost:5432 (dev) / Neon serverless (production) | `knowledge_feed` | Primary DB — 19 model via Prisma, PGVector extension via raw SQL |
| `REDIS_URL` | Redis | localhost:6379 (dev) / Upstash (production) | db 0 | Cache + queue backend (BullMQ) |

---

## Migration Layout

| Path | Domain |
|------|--------|
| `backend/prisma/migrations/` | All migrations — Prisma auto-generate |
| `backend/prisma/schema.prisma` | Schema source of truth — 19 models |

---

## Models (19 Prisma Models)

| Model | Table | Purpose | Key Fields |
|-------|-------|---------|------------|
| User | `users` | Registered users | username (unique), email? (unique), passwordHash, displayName, bio, avatarUrl, role (USER/ADMIN), readingLevel |
| Session | `sessions` | Refresh token persistence | refreshToken (SHA-256 hash, unique), userId, deviceInfo, ipAddress, isRevoked, expiresAt |
| Domain | `domains` | Knowledge domains | name (unique), parentDomainId (self-referential hierarchy) |
| Hashtag | `hashtags` | Normalized hashtags | name (unique), domainId (FK → domains) |
| PostHashtag | `post_hashtags` | M:N join: card ↔ hashtag | postId, tagId (composite PK) |
| UserFollowDomain | `user_follow_domains` | User domain subscriptions | userId, domainId (@@unique) |
| KnowledgeCard | `knowledge_cards` | AI-generated content cards | title, content, type, domainId (FK → domains), sourceUrl, sourceName, aiModel, engagementScore, moderationStatus, citations (JSON), sourceChunkIds (String[]), sourceData (JSON?), factCheckScore |
| Reaction | `reactions` | Unified LIKE/DISLIKE | userId, postId, reactionType (enum: LIKE/DISLIKE), @@unique([userId, postId, reactionType]) |
| Repost | `reposts` | Card reposts | userId, postId (@@unique) |
| Bookmark | `bookmarks` | Saved cards | userId, postId (@@unique) |
| Follow | `follows` | User follows user | followerId, followingId (@@unique) |
| Mention | `mentions` | Comment @mentions | commentId, mentionedUserId (@@unique) |
| PostView | `post_views` | Card view tracking | userId (nullable), postId, viewedAt, @@unique([userId, postId]) |
| Comment | `comments` | Card comments + replies | content, userId, postId, parentId (self-referential), isDeleted |
| Report | `reports` | User reports | reason (String), reportedPostId (nullable FK), reportedCommentId (nullable FK), status (pending/reviewed/resolved), resolvedByUserId |
| ContentVerification | `content_verifications` | Fact-check sourcing | postId, sourceName, sourceUrl, factChecker, status (verified/unverified/disputed) |
| KnowledgeSource | `knowledge_sources` | arXiv paper metadata | externalId (unique), sourceType, title, authors[], abstract, contentHash (SHA-256 dedup), status |
| DocumentChunk | `document_chunks` | Text chunks + embeddings | content, chunkIndex, tokenCount, sourceId, embedded flag, embedding column via raw SQL (vector(1024)) |
| FactCheckResult | `fact_check_results` | Claim verification | claim, verified, confidence, sourceType, sourceUrl, cardId |
| PipelineJob | `pipeline_jobs` | Pipeline execution tracking | bullmqJobId (unique), type, status, input (JSON), output (JSON), currentStep, progress |

**Deleted models (v1→v2):**
- `Like` / `Dislike` → unified into `Reaction` with `reactionType` enum
- `View` → renamed to `PostView`
- `UserPreferences` → `readingLevel` folded into User, `domains[]` replaced by `UserFollowDomain`
- `savedCards` implicit relation → explicit `Bookmark` model

---

## Key Indexes (v2)

| Index | Table | Purpose |
|--------|-------|---------|
| `@@index([domainId, createdAt(sort: Desc)], map: "idx_knowledge_cards_domain_created")` | knowledge_cards | Feed query: `WHERE domainId IN (...) ORDER BY createdAt DESC` |
| `@@index([createdAt, engagementScore(sort: Desc)], map: "idx_knowledge_cards_created_engagement")` | knowledge_cards | Trending query: `WHERE createdAt >= 7d ORDER BY engagementScore DESC` |
| `@@index([moderationStatus])` | knowledge_cards | Moderation filter |
| `@@unique([sourceId, chunkIndex])` | document_chunks | Dedup per source |
| `@@unique([userId, postId, reactionType])` | reactions | One reaction type per user per post |
| `@@unique([userId, postId])` | bookmarks, reposts | One per user per post |
| `@@unique([userId, postId])` | post_views | Dedup per authenticated user |
| `@@index([postId])` | post_views, comments | Card detail queries |
| `@@index([userId])` | post_views | User view history |
| `@@unique([followerId, followingId])` | follows | One follow relationship per pair |
| `@@unique([commentId, mentionedUserId])` | mentions | Dedup mention per comment |
| `@@unique([userId, domainId])` | user_follow_domains | One subscription per user-domain |

---

## Cross-Database Relationship Style

Single database, no cross-DB queries. Semua relasi via Prisma foreign keys dengan `onDelete: Cascade`:
- Cascade delete: KnowledgeCard → reactions, reposts, bookmarks, postViews, comments, reports, factCheckResults, contentVerifications, postHashtags
- Cascade delete: User → sessions, followedDomains, reactions, reposts, bookmarks, followers, following, postViews, comments, reportsFiled, reportsResolved, mentions
- Cascade delete: Domain → hashtags, followedBy, posts
- Cascade delete: Hashtag → postHashtags
- Cascade delete: KnowledgeSource → DocumentChunk
- Cascade delete: Comment → replies (self-referential), mentions

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
