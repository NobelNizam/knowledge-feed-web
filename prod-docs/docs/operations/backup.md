# Backup Strategy — Knowledge Feed Web

> **Last Updated:** 2026-07-08

---

## Current State

**Belum ada automated backup.** Neon menyediakan backup internal, tapi tidak ada scheduled `pg_dump` dari aplikasi.

---

## Backup Plan

### Database (Neon PostgreSQL)

Neon free tier menyediakan point-in-time recovery. Untuk safety tambahan:

**Manual backup** (via local):
```bash
pg_dump "postgresql://{user}:{pass}@ep-muddy-mud-ao2bmdby-pooler.ap-southeast-1.aws.neon.tech/knowledge_feed?sslmode=require" > backup_$(date +%Y%m%d).sql
```

**Target**: Daily `pg_dump` ke MinIO (atau local storage). MinIO container sudah jalan di local dev. Untuk production, bisa pakai Cloudflare R2 (10GB gratis, S3-compatible).

### Redis (Upstash)

Data di Redis bersifat cache — tidak perlu backup. Key:
- `feed:domain:*` — domain feed cache (regenerated dari DB)
- `view:anon:*` — anonymous view dedup (expire 24h)
- `lock:refresh:user:*` — concurrency lock (expire 60s)

---

## Restoration Test

Belum dilakukan. Harus di-test sebelum production-critical.

```bash
# Restore PostgreSQL
psql "postgresql://..." < backup_20260708.sql
```

---

## Monitoring Backup

- Cek backup file exists daily
- Verify backup size not zero
- Test restore quarterly
