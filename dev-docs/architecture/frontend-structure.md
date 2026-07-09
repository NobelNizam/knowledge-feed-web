# Frontend Structure

> **Status:** DATA FILE — Update saat ada perubahan struktur frontend.
> **Purpose:** Dokumentasi struktur frontend: rendering, layout, komponen, dependency, asset pipeline.

---

## Rendering Model

**100% Client-Side Rendering (CSR).** Semua halaman menggunakan `'use client'` directive. Tidak ada server-side data fetching — data diambil via `fetch` client-side setelah mount. Next.js App Router digunakan untuk routing, bukan untuk SSR.

Alur: Browser → Next.js → serve HTML shell → React hydrate → fetch API (`/api/*` via Next.js rewrites ke backend) → render data.

---

## Layout Architecture

| Path | Purpose |
|------|---------|
| `web/app/layout.tsx` | Root layout — HTML shell, Inter font, ThemeProvider + AuthProvider + Topbar + MainLayout + Bottombar |
| `web/components/shared/Topbar.tsx` | Top navigation bar — search input, auth buttons, theme toggle |
| `web/components/shared/Bottombar.tsx` | Mobile bottom navigation |
| `web/components/shared/MainLayout.tsx` | Content wrapper with sidebar slots |
| `web/components/shared/LeftSidebar.tsx` | Left sidebar — nav links (Home, Search, Profile, Admin) |
| `web/components/shared/RightFilterPanel.tsx` | Right filter panel — domain/category checkboxes |
| `web/components/shared/ThemeToggle.tsx` | Dark/light/system toggle button |
| `web/components/theme-provider.tsx` | next-themes provider wrapper |
| `web/components/cards/KnowledgeFeedCard.tsx` | Individual feed card — title, content, domain badge, action buttons (like, dislike, comment, share, save, report) |
| `web/components/cards/SkeletonCard.tsx` | Loading placeholder — animated pulse skeleton |
| `web/components/OnboardingView.tsx` | First-time user domain selection dialog |
| `web/components/AdminGuard.tsx` | HOC redirect if user is not admin |
| `web/components/ui/` | shadcn/ui primitives: separator, button, slot |

---

## Page Organization

| Path | Component | Purpose |
|------|-----------|---------|
| `web/app/page.tsx` | Home | Main feed — infinite scroll, pull-to-refresh, filter tabs, onboarding trigger, SSE pipeline progress overlay |
| `web/app/login/page.tsx` | Login | Email + password form, redirect to feed after success |
| `web/app/register/page.tsx` | Register | Name + email + password form, auto-login after success |
| `web/app/card/[id]/page.tsx` | CardDetail | Single card — full content, citations, comments section, interaction buttons |
| `web/app/profile/page.tsx` | Profile | User info, tabs (Bookmark/Repost), follower/following counts (clickable), email hidden (shows @username), mobile-optimized layout |
| `web/app/profile/settings/page.tsx` | Settings | Edit profile name, avatar, bio, preferences |
| `web/app/admin/page.tsx` | AdminDashboard | Reports inbox, delete feed, user stats, pipeline toggle |
| `web/app/search/page.tsx` | Search | Keyword search with domain filter |
| `web/app/user/[id]/page.tsx` | UserProfile | Public user profile |
| `web/app/user/[id]/followers/page.tsx` | FollowersList | List of user's followers |
| `web/app/user/[id]/following/page.tsx` | FollowingList | List of who user follows |

---

## State Management

| Store | Type | Scope | Purpose |
|-------|------|-------|---------|
| `AuthContext.tsx` | React Context | Global | User object, loading state, login/logout/refreshUser actions |
| `FilterContext.tsx` | React Context | Global | Active filter (type, value, domains), toggleFilter |
| `useFeedState.ts` | Custom Hook | Page-level (Home) | cards array, pagination (seenIds, offset, hasMore), scroll position, SSE pipeline state, touch handlers — all persisted to sessionStorage |
| `sessionStorage` | Web Storage | Browser tab | `feed_tab_states` (JSON per filter tab), `scroll_pos_{key}` (scroll position per tab) |

---

## Frontend Dependencies

| Dependency | Version | Use |
|-----------|---------|-----|
| next | 14.2.35 | React framework (App Router) |
| react / react-dom | 18.2 | UI library |
| tailwindcss | 3.4 | Utility-first CSS framework |
| @radix-ui/react-separator | 1.1 | Accessible separator primitive |
| @radix-ui/react-slot | 1.3 | Slot pattern for composition |
| lucide-react | 1.21 | Icon library |
| next-themes | 0.4.6 | Dark/light theme toggle |
| class-variance-authority | 0.7 | Component variant API |
| clsx | 2.1 | Conditional classnames |
| tailwind-merge | 3.6 | Merge Tailwind classes without conflicts |
| tailwindcss-animate | 1.0 | Animation utilities |

---

## Asset Pipeline

- **Build**: `next build` — auto code splitting, minification, CSS purging (Tailwind JIT)
- **Dev**: `next dev` with Fast Refresh
- **CSS**: Tailwind CSS with `tailwind.config.js` + `postcss.config.js` + `app/globals.css`
- **Font**: Inter via `next/font/google` — auto subset, no layout shift
- **Images**: `next/image` with `domains: ['upload.wikimedia.org']`
- **API Proxy**: `next.config.js` rewrites `{ source: '/api/:path*', destination: '${API_UPSTREAM_URL}/api/:path*' }`
