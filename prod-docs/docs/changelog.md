# Production Changelog — Knowledge Feed Web

> **Last Updated:** 2026-07-08

---

## 2026-07-08 — Initial Production Deployment

### Infrastructure
- Vercel: frontend `bishamon.vercel.app`
- Render: backend `bishamonback.onrender.com`
- Neon: PostgreSQL `ap-southeast-1`
- Upstash: Redis cache + queue

### Application
- Backend: Express/TypeScript, Prisma, BullMQ
- Frontend: Next.js 14.2.35, React 18, Tailwind
- Full RAG pipeline: arXiv → NIM embed → NIM LLM → fact-check → moderate → publish

### Security
- JWT auth with HttpOnly cookies
- CSRF Origin/Referer guard
- Rate limiting 1000 req/15min
- Helmet security headers
- PII redaction in logs
- Refresh token SHA-256 hash in DB

### Known Limitations
- Render free tier cold start
- No automated database backup
- No monitoring (besides UptimeRobot recommendation)
- Search: ILIKE (not tsvector full-text)
- No refresh token rotation
