# User — Models

| Model | Table | Key Fields |
|-------|-------|------------|
| User | `users` | id, name, email (unique), password, role, avatarUrl |
| UserPreferences | `user_preferences` | userId (unique), domains (String[]), readingLevel, dailyDigest |

**Relasi**:
- User 1:1 UserPreferences (Cascade)
- User N:M KnowledgeCard via `savedCards` (`@relation("SavedCards")`)

**Save/unsave**: Denormalized `saveCount` di KnowledgeCard — di-increment/decrement secara atomik saat user save/unsave.
