# Deployment Process — Knowledge Feed Web

> **Last Updated:** 2026-07-08

---

## Deployment Architecture

```
Developer → git push origin main
                │
    ┌───────────┴───────────┐
    ▼                       ▼
  Vercel                  Render
  (auto-detect Next.js)   (Node.js web service)
  npm install             npm install
  next build              npx prisma generate
  deploy                  npm run build (tsc)
                          npm start
```

---

## Vercel (Frontend)

| Item | Value |
|------|-------|
| Repository | `github.com/NobelNizam/knowledge-feed-web` |
| Root Directory | `web` |
| Framework | Next.js (auto-detected) |
| Build Command | `next build` (auto) |
| Output Directory | `.next` (auto) |

**Environment Variables**:
```
API_UPSTREAM_URL=https://bishamonback.onrender.com
```

---

## Render (Backend API)

| Item | Value |
|------|-------|
| Repository | `github.com/NobelNizam/knowledge-feed-web` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npm start` |
| Plan | Free (sleeps after 15 min idle) |

**Environment Variables**:
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://{user}:{pass}@ep-muddy-mud-ao2bmdby-pooler.ap-southeast-1.aws.neon.tech/knowledge_feed?sslmode=require
REDIS_URL=redis://{user}:{pass}@full-oyster-68989.upstash.io:6379
JWT_SECRET={generated_96_hex}
REFRESH_TOKEN_SECRET={generated_96_hex}
SESSION_SECRET={generated_96_hex}
FRONTEND_URL=https://bishamon.vercel.app
NVIDIA_API_KEY=nvapi-{...}
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
NVIDIA_EMBED_MODEL=nvidia/nv-embedqa-e5-v5
ANON_VIEW_SALT={generated_64_hex}
```

> **Security**: Semua nilai secret di-generate per environment. Credential disimpan di Render dashboard, tidak di repo.

---

## Database Migration

Jalankan dari lokal dengan DATABASE_URL mengarah ke Neon:

```bash
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Atau via Neon SQL Editor: upload file `.sql` dari `backend/prisma/migrations/`.

---

## Post-Deploy Verification

```bash
# Backend health check
curl https://bishamonback.onrender.com/health
# → {"status":"ok"}

# Frontend
curl -I https://bishamon.vercel.app
# → 200 OK
```

---

## Rollback

### Backend
```bash
git revert <HASH> && git push origin main
# Render auto-deploy
```

### Frontend
- Vercel Dashboard → Deployments → pilih deployment sebelumnya → **Promote to Production**
