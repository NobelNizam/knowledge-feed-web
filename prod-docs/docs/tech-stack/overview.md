# Tech Stack — Knowledge Feed Web (Production)

---

## Frontend — Next.js (Vercel)

| Item | Value |
|------|-------|
| Platform | Vercel Hobby |
| Framework | Next.js 14.2.35 |
| React | 18.2 |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix) |
| State | React Context + sessionStorage |
| API Client | Native fetch + 401 auto-refresh interceptor |
| Domain | bishamon.vercel.app |
| Build | `next build` (auto by Vercel) |
| Env Vars | `API_UPSTREAM_URL` |

---

## Backend API — Express/TypeScript (Render)

| Item | Value |
|------|-------|
| Platform | Render Free |
| Runtime | Node.js 22 + tsx (dev) / tsc → node (prod) |
| Framework | Express 4.18 |
| TypeScript | 6.0.3 (strict, noEmit in dev, tsc in prod) |
| ORM | Prisma 5.7 |
| Auth | JWT (bcrypt, HttpOnly cookies) |
| Rate Limit | 1000 req/15min (express-rate-limit) |
| Security | helmet, CORS whitelist, CSRF middleware |
| Domain | bishamonback.onrender.com |
| Build | `npm install && npx prisma generate && npm run build` |
| Start | `npm start` (node dist/index.js) |
| Cold Start | ~30 detik (free tier) |

---

## Database — PostgreSQL + PGVector (Neon)

| Item | Value |
|------|-------|
| Platform | Neon Free |
| Version | PostgreSQL 14 |
| Extension | PGVector |
| Host | `ep-muddy-mud-ao2bmdby-pooler.ap-southeast-1.aws.neon.tech` |
| Storage | 0.5 GB |
| Connection | SSL-enforced (`?sslmode=require`) |
| ORM | Prisma 5.7 |
| Migrations | Manual via `npx prisma migrate deploy` |

---

## Cache & Queue — Redis (Upstash)

| Item | Value |
|------|-------|
| Platform | Upstash Free |
| Version | Redis 7 |
| Host | `full-oyster-68989.upstash.io:6379` |
| Memory | 10 MB |
| Commands | 1000/day |
| Cache TTL | 15 menit (feed), 24 jam (anon view) |
| Queue | BullMQ 5.79 (single worker, retry 3x) |
| Key Pattern | SCAN-based invalidation (no KEYS) |

---

## AI — NVIDIA NIM API

| Item | Value |
|------|-------|
| LLM | `meta/llama-3.1-70b-instruct` |
| Embedding | `nvidia/nv-embedqa-e5-v5` (1024-dim) |
| SDK | openai npm package (OpenAI-compatible) |
| Timeout | 3 min |
| Retry | 2x exponential |
| Base URL | `https://integrate.api.nvidia.com/v1` |
