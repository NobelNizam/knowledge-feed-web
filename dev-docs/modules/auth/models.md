# Auth — Models

| Model | Table | Key Fields |
|-------|-------|------------|
| User | `users` | id (serial), username (unique), email? (unique), passwordHash (bcrypt), displayName, bio, role (USER/ADMIN), readingLevel, avatarUrl |
| Session | `sessions` | id (cuid), userId (FK), refreshToken (SHA-256 hash, unique), deviceInfo, ipAddress, isRevoked, expiresAt |

**Relasi**:
- User 1:N Session (Cascade)
- User 1:N UserFollowDomain (via `user_follow_domains`)
- User 1:N Bookmark (via `bookmarks`) — replaces v1 `savedCards` implicit relation

**Refresh token flow**: JWT refresh token → SHA-256 hash → `Session.refreshToken`(64 hex chars). Saat validasi: hash dari cookie → cari di DB. Session juga menyimpan `isRevoked` flag dan `deviceInfo`(v2 menggantikan `userAgent`).
