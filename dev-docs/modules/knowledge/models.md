# Knowledge — Models

| Model | Table | Key Fields |
|-------|-------|------------|
| KnowledgeCard | `knowledge_cards` | id, title, content, domain, tags[], engagementScore, moderationStatus, citations (JSON), sourceChunkIds[], factChecked, factCheckScore |
| Like | `likes` | userId, cardId (unique composite) |
| Dislike | `dislikes` | userId, cardId (unique composite) |
| View | `views` | userId (nullable), cardId |
| Comment | `comments` | content, userId, cardId, parentId (self-referential → replies) |
| Report | `reports` | reasons[], userId, cardId (unique composite) |

**Key Indexes**:
- `@@index([domain, createdAt DESC])` — Feed queries
- `@@index([createdAt, engagementScore DESC])` — Trending queries
- `@@index([cardId])` on views, comments — Card detail queries
- `@@unique([userId, cardId])` on likes, dislikes, views, reports — One per user per card
