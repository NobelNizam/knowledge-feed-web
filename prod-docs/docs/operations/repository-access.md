# Repository Access — Knowledge Feed Web

> **Last Updated:** 2026-07-08

---

## Repository

| Item | Value |
|------|-------|
| URL | `https://github.com/NobelNizam/knowledge-feed-web` |
| SSH | `git@github.com:NobelNizam/knowledge-feed-web.git` |
| Branch (production) | `main` |
| Branch (development) | `dev` |

---

## Git Policy

| Action | Rule |
|--------|------|
| Development | Kerja di `dev`, commit + push |
| Production deploy | Merge `dev` → `main` (dengan exclude `dev-docs/`), push |
| Rollback | `git revert <HASH>` di `main` |

---

## Merge Procedure (dev → main)

```bash
git checkout dev && git pull
git checkout main && git pull
git merge --no-commit --no-ff dev
git restore --source=HEAD --staged --worktree dev-docs
git commit -m "merge: dev -> main (exclude dev-docs)"
git push origin main
git checkout dev
```

---

## Vercel + Render Integration

Kedua platform terhubung ke GitHub repository. Push ke `main` memicu:
- **Vercel**: auto-detect `web/` sebagai Next.js project → `next build` → deploy
- **Render**: auto-detect `backend/` sebagai Node project → `npm install && npx prisma generate && npm run build` → `npm start`
