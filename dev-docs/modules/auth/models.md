# Auth — Models

| Model | Table | Key Fields |
|-------|-------|------------|
| User | `users` | id (cuid), name, email (unique), password (bcrypt hash), role (USER/ADMIN), avatarUrl |
| Session | `sessions` | id (cuid), userId (FK), refreshToken (SHA-256 hash, unique), userAgent, ipAddress, expiresAt |
| UserPreferences | `user_preferences` | id (cuid), userId (unique FK), domains (String[]), readingLevel |

**Relasi**:
- User 1:1 UserPreferences (Cascade)
- User 1:N Session (Cascade)
- User N:M KnowledgeCard via `savedCards` relation

**Refresh token flow**: JWT refresh token → SHA-256 hash → `Session.refreshToken` (64 hex chars). Saat validasi: hash dari cookie → cari di DB.
