# AGENTS.md — Aturan untuk AI Agent di Production (Knowledge Feed)

> **Server:** bishamon.vercel.app / bishamonback.onrender.com
> **Environment:** Production (Managed Services)
> **Last Updated:** 2026-07-08

---

## Server Information

| Item | Value |
|------|-------|
| Project Name | Knowledge Feed Web |
| Frontend | Vercel — `bishamon.vercel.app` |
| Backend API | Render — `bishamonback.onrender.com` |
| Database | Neon (PostgreSQL) — `ep-muddy-mud-ao2bmdby-pooler.ap-southeast-1.aws.neon.tech` |
| Redis | Upstash — `full-oyster-68989.upstash.io` |
| LLM / Embedding | NVIDIA NIM API |
| Git Repository | `github.com/NobelNizam/knowledge-feed-web` |
| Branch (prod) | `main` |
| Branch (dev) | `dev` |

---

## Infrastructure Architecture

```
User → bishamon.vercel.app (Vercel, Next.js)
         │  fetch /api/* → Next.js rewrites → API_UPSTREAM_URL
         ▼
       bishamonback.onrender.com (Render, Express/TS)
         │
         ├── Neon (PostgreSQL + PGVector)
         ├── Upstash (Redis — cache + BullMQ queue)
         └── NVIDIA NIM API (LLM + Embedding)
```

---

## Deployment Overview

| Component | Platform | Deploy Trigger | Notes |
|-----------|----------|---------------|-------|
| Frontend | Vercel | Push to `main` → auto-deploy | Next.js auto-detected |
| Backend | Render | Push to `main` → auto-deploy | Build: `npm install && npx prisma generate && npm run build`. Start: `npm start` |
| Database | Neon | N/A | Serverless PostgreSQL, never sleeps |
| Redis | Upstash | N/A | Serverless Redis, 10MB free tier |

---

## CRITICAL: Production Rules

### 1. Deploy via Git Push

- Push ke `main` → Vercel + Render auto-deploy
- JANGAN merge `dev` → `main` tanpa exclude `dev-docs/`:
  ```bash
  git checkout main && git merge --no-commit --no-ff dev
  git restore --source=HEAD --staged --worktree dev-docs
  git commit -m "merge: dev -> main (exclude dev-docs)"
  git push origin main
  ```

### 2. Render Cold Start

- Free tier sleep setelah 15 menit idle
- Wake-up ~30 detik
- **UptimeRobot**: ping `https://bishamonback.onrender.com/health` tiap 14 menit (gratis)

### 3. Environment Variables

Semua env vars diset di dashboard Render dan Vercel — JANGAN commit `.env` ke repo.

### 4. Health Check

```bash
curl https://bishamonback.onrender.com/health
# → {"status":"ok","timestamp":"...","service":"Knowledge Feed API"}
```

### 5. Database Migrations

Jalankan dari lokal dengan DATABASE_URL mengarah ke Neon:
```bash
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## Known Limitations (Free Tier)

| Platform | Batasan | Mitigasi |
|----------|---------|----------|
| Render | Sleep 15 min idle, 750 jam/bulan | UptimeRobot ping |
| Neon | 0.5 GB storage, 100 jam compute/bulan | Cukup untuk dev/hobi |
| Upstash | 10 MB, 1000 cmd/hari | Pakai untuk cache saja, jangan heavy queue |
| Vercel | 100 GB bandwidth | Cukup untuk hobi |

---

## Rollback Procedure

```bash
# Backend rollback
git revert <HASH> && git push origin main
# Render akan auto-redeploy

# Frontend rollback
# Vercel dashboard → Deployments → pilih deployment sebelumnya → Promote to Production
```

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Developer | NobelNizam (GitHub) |
