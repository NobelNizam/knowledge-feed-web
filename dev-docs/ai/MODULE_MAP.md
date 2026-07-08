# MODULE_MAP

> **Status:** DATA FILE — Update saat ada modul baru atau perubahan struktur.
> **Purpose:** Mapping visual antara modul bisnis dan file kode aktual.

---

## Backend Map

| Module | Route File | Route Handlers (di route file) | Models (Prisma) | Services |
|--------|-----------|------|--------|----------|
| Auth | `routes/auth.ts` (247 lines) | register, login, logout, refresh, me | User, Session, UserPreferences | `lib/jwtSecrets.ts` |
| Feed | `routes/feed.ts` (477 lines) | GET /, POST /personalized, POST /refresh, GET /refresh/sse | KnowledgeCard | `services/cacheService.ts`, `services/domainHierarchy.ts` |
| Knowledge | `routes/knowledge.ts` (466 lines) | GET search/trending/domains/tags/:id/:id/comments, POST like/view/share/dislike/report/comments | KnowledgeCard, Like, Dislike, View, Comment, Report | `updateEngagementScore()` (internal) |
| User | `routes/user.ts` (131 lines) | PUT preferences, POST save, PUT profile, GET / | User, UserPreferences | — |
| Admin | `routes/admin.ts` (98 lines) | POST pipeline/status, POST config/fact-check, GET stats/users, DELETE feed/:id, GET/DELETE reports | KnowledgeCard, Report, User, Session | `services/cacheService.ts` |
| Generate | `routes/generate.ts` (180 lines) | POST /, GET /status/:jobId, GET /stats, GET /sources | PipelineJob, KnowledgeSource | `queue/queueManager.ts`, `queue/workers/pipelineWorker.ts` |
| Pipeline | `pipeline/*.ts` (9 files) | RAG pipeline steps | KnowledgeSource, DocumentChunk, FactCheckResult | `services/aiGenerator.ts` (LLM) |
| Queue | `queue/` | queueManager (Redis+BullMQ), workers/pipelineWorker | PipelineJob | — |

---

## Frontend Map

| Module | Pages | Components | API Client | State/Context |
|--------|-------|-----------|-----------|---------------|
| Auth | `app/login/page.tsx`, `app/register/page.tsx` | — | `lib/api.ts` (authAPI) | `lib/AuthContext.tsx` |
| Feed | `app/page.tsx` (334 lines) | `components/cards/KnowledgeFeedCard.tsx`, `components/cards/SkeletonCard.tsx`, `components/OnboardingView.tsx` | `lib/api.ts` (feedAPI) | `hooks/useFeedState.ts` + `lib/FilterContext.tsx` |
| Card Detail | `app/card/[id]/page.tsx` | — | `lib/api.ts` (knowledgeAPI, interactionAPI) | — |
| Profile | `app/profile/page.tsx`, `app/profile/settings/page.tsx` | — | `lib/api.ts` (userAPI) | `lib/AuthContext.tsx` |
| Admin | `app/admin/page.tsx` | `components/AdminGuard.tsx` | `lib/api.ts` | `lib/AuthContext.tsx` |
| Search | `app/search/page.tsx` | — | `lib/api.ts` (knowledgeAPI) | — |
| Shared Layout | `app/layout.tsx` | `components/shared/Topbar.tsx`, `components/shared/Bottombar.tsx`, `components/shared/MainLayout.tsx`, `components/shared/LeftSidebar.tsx`, `components/shared/RightFilterPanel.tsx`, `components/shared/ThemeToggle.tsx`, `components/theme-provider.tsx` | — | — |
| UI Primitives | — | `components/ui/` (shadcn: separator, button, slot) | — | — |

---

## Shared Infrastructure Map

| Area | Path | Notes |
|------|------|-------|
| Auth Middleware | `backend/src/middleware/auth.ts` | JWT cookie verification, sets `req.user` |
| Admin Middleware | `backend/src/middleware/admin.ts` | Role check: `req.user.role === 'ADMIN'` |
| Prisma Singleton | `backend/src/lib/prisma.ts` | Global singleton, tidak ada multi-instance |
| JWT Secrets | `backend/src/lib/jwtSecrets.ts` | Fails fast if missing in non-test env |
| Logger | `backend/src/lib/logger.ts` | Minimal wrapper — routes mostly use `console.*` |
| API Client | `web/lib/api.ts` | Native fetch + 401 auto-refresh interceptor |
| API Types | `web/lib/types.ts` | Shared TypeScript interfaces |
| Domain Mapping | `web/lib/domainMapping.ts` | Domain colors, level mappings, descriptions |
| Utils | `web/lib/utils.ts` | `cn()` tailwind-merge helper |
