# AGENTS (AI Working Contract for This Repo)

> **Status:** GUIDANCE FILE — Kontrak kerja spesifik untuk repository ini.
> **Purpose:** Ringkasan aturan kerja AI agent. Melengkapi `ai-rules/AGENTS.md`.

---

## 1) Project Identity

| Item | Value |
|------|-------|
| Project Type | Fullstack (Monorepo) |
| Repo | Single git at project root |
| Git Folder | Root (tidak perlu `cd apps` atau `cd backend`) |
| Code Folders | `backend/` (Express/TypeScript) + `web/` (Next.js) |
| Active Branch | `dev` |

---

## 2) Common Rules

### Branch and Git Policy

1. Kerja di branch `dev` (atau `feat/*`) — jangan commit ke `main` (belum ada)
2. Jangan force push
3. Batch kecil: 1 perubahan jelas → 1 commit → push
4. Preflight: `git status && git log --oneline -5`
5. Checkpoint sebelum mulai ubah: `git add -A && git commit -m "chore: checkpoint"`

### Change Scope Rules

- Jangan refactor besar tanpa kebutuhan langsung
- Jangan sentuh `.env`, `backend/.env`, `web/.env.local`
- Fokus pada root cause, bukan symptom patch
- Pipeline harus selalu async via BullMQ — jangan tambahkan sync fallback di refresh path
- Jika menambah env key: update `.env.example` di commit yang sama (placeholder, bukan nilai asli)
- Jangan ubah file di `ai-rules/` — immutable

### Commit Message Format

```
type: judul singkat

Body (2-3 baris):
- Apa yang dikerjakan
- Kenapa dilakukan
- Dampak perubahan
```

Types: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `security:`, `build:`

---

## 3A) Backend-Specific Rules

- Framework: Express 4.18 + TypeScript (runtime `tsx`)
- Route pattern: REST di `/api/*` (no versioning, no GraphQL)
- Auth: JWT access (15 min) + refresh (7 hari) via HttpOnly cookies
- ORM: Prisma 5.7
- Testing: Jest + ts-jest (`npm test`)
- TypeScript: strict mode, `noImplicitAny: false`, `allowJs: true`
- Module export: `export = router` (CommonJS compat)
- Validasi input: inline di route handler, tidak ada DTO/FormRequest
- Cache: Redis SCAN pattern, tidak boleh pakai `KEYS`

### Backend Verifikasi Minimum

```bash
cd backend
npm run typecheck    # tsc --noEmit
npm test             # 29/29 harus pass
```

---

## 3B) Frontend-Specific Rules

- Framework: Next.js 14.2.35 (App Router)
- Rendering: 100% CSR (`'use client'`)
- State management: React Context + custom hooks
- Styling: Tailwind CSS 3.4 + shadcn/ui (Radix) + `cn()` utility
- API client: Native `fetch` via `web/lib/api.ts` — credentials include + 401 interceptor
- Icons: `lucide-react` (jangan pakai library ikon lain)
- Theme: `next-themes` (dark/light/system)

### Frontend Verifikasi Minimum

```bash
cd web
npm run lint    # next lint
npm run build   # next build
```

---

## 4) Documentation Maintenance

Setiap akhir task, update file-file berikut jika terdampak:

| File | When |
|------|------|
| `dev-docs/ai/CURRENT_STATE.md` | Setiap selesai task |
| `dev-docs/ai/TASKS.md` | Task baru/selesai |
| `dev-docs/ai/KNOWN_ISSUES.md` | Issue baru/terselesaikan |
| `dev-docs/ai/TECHNICAL_DEBT.md` | Tech debt baru/lunas |
| `dev-docs/ai/COMMIT_LOG.md` + `commit-logs/` | Setiap commit |
| `dev-docs/CHANGELOG.md` | Setiap milestone |
| `dev-docs/ai/FINAL_SYSTEM_HANDOVER.md` | Setelah push ke dev |

---

## 5) Communication Style

- Ringkas, langsung ke hasil
- Bedakan fakta vs asumsi — untuk ketidakpastian: "Assumption based on repository analysis"
- Selalu sebutkan file path lengkap (contoh: `backend/src/routes/feed.ts:445`)
- Gunakan format tabel untuk data terstruktur
