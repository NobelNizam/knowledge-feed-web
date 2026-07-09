# User — Models

| Model | Table | Key Fields |
|-------|-------|------------|
| User | `users` | id (serial), username (unique), email? (unique), passwordHash, displayName, bio, avatarUrl, role, readingLevel |

**Relasi**:
- User 1:N Bookmark via `bookmarks` — replaces v1 `savedCards` implicit relation
- User N:M Domain via UserFollowDomain (`user_follow_domains`) — replaces v1 `UserPreferences.domains[]`
- User N:M User via Follow (`follows`)
- UserHasMany: reactions, reposts, postViews, comments, sessions, mentions

**Bookmark/save**: Denormalized `saveCount` di KnowledgeCard — di-increment/decrement secara atomik saat user bookmark/unbookmark.

**Deleted**: `UserPreferences` — `readingLevel` folded into User, domain subscriptions via `UserFollowDomain`.
