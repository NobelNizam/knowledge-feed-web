# Knowledge — Models

| Model | Table | Key Fields |
|-------|-------|------------|
| KnowledgeCard | `knowledge_cards` | id, title, content, type, domainId (FK → domains), sourceUrl, sourceName, aiModel, viewCount, saveCount, shareCount, repostCount, engagementScore, isPublished, moderationStatus, citations (JSON), sourceData (JSON?), sourceChunkIds (String[]), factChecked, factCheckScore |
| Reaction | `reactions` | userId, postId, reactionType (LIKE/DISLIKE enum), @@unique([userId, postId, reactionType]) |
| Repost | `reposts` | userId, postId (@@unique) |
| Bookmark | `bookmarks` | userId, postId (@@unique) |
| PostView | `post_views` | userId (nullable), postId, viewedAt |
| Comment | `comments` | content, userId, postId, parentId (self-referential → replies), isDeleted |
| Report | `reports` | reason (String), reporterUserId, reportedPostId (nullable FK), reportedCommentId (nullable FK), status (pending/reviewed/resolved), resolvedByUserId |
| ContentVerification | `content_verifications` | postId, sourceName, sourceUrl, factChecker, status (verified/unverified/disputed) |

**Key Indexes**:
- `@@index([domainId, createdAt(sort: Desc)])` — Feed queries
- `@@index([createdAt, engagementScore(sort: Desc)])` — Trending queries
- `@@index([postId])` on post_views, comments — Card detail queries
- `@@unique([userId, postId, reactionType])` on reactions — One reaction type per user per post
- `@@unique([userId, postId])` on post_views, bookmarks, reposts — One per user per post
- `@@unique([postId, tagId])` composite PK on post_hashtags
- `@@unique([userId, domainId])` on user_follow_domains
