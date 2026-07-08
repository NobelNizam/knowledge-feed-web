# Admin — Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| cacheService | internal | `invalidateDomainCache()` — invalidate Redis cache saat delete feed |

**Known issues**:
- O3: POST pipeline/status dan config/fact-check return sukses tanpa implementasi → harus return 501
- O7: DELETE feed hard delete tanpa soft delete/audit trail → cascade hapus semua relasi
