# DESIGN

## Project Overview

- **Goal:** Membuat Web App + PWA untuk mengubah kebiasaan *scrolling* menjadi kegiatan edukatif dengan fakta-fakta menarik.
- **Target:** Multi-user.
- **Backend:** Local laptop (dengan *easy cloud deployment option*).
- **Mobile:** Responsive web + PWA (*ready-to-PWA*, installable di home screen).

---

## Tech Stack

### Frontend (Web App)
- **Framework:** Next.js 14 (React + App Router)
- **Styling:** Tailwind CSS
- **State:** React Hooks & API client (Axios)
- **PWA:** *Planned* (menggunakan `next-pwa`)
- **UI Components:** Custom Tailwind

### Backend (API)
- **Framework:** Node.js + Express
- **Database:** PostgreSQL (local: Docker, cloud: Supabase)
- **ORM:** Prisma
- **AI Generator:** Nvidia NIM API (OpenAI SDK compatible) - *Zero Seed Data Architecture*
- **Cache:** Redis (optional untuk MVP)

### Deployment Options
- **Local:** Backend di laptop, frontend di localhost:3000
- **Cloud:** Backend ke Render/Vercel, Frontend ke Vercel
- **Hybrid:** Backend local, frontend deploy ke Vercel (accessible dari mana saja)

---

## Architecture
### Web App + PWA:
```text
Web Browser → Next.js Frontend → Backend API → Database (PostgreSQL)
                    ↓                  ↓
            PWA Service Worker    AI Generator
                                 (Auto-generate)
```

---

## Project Structure

```text
knowledge-feed-app/
├── backend/              # Express API (100% AI-Driven)
│   ├── prisma/           # Schema database
│   ├── src/              # Logic, Routes, AI Services
│   └── package.json
│
├── web/                  # Web App (Ready to PWA)
│   ├── app/              # Next.js app router & Feed UI
│   ├── components/       # Knowledge Cards
│   ├── lib/              # API clients
│   ├── public/           # PWA assets (Icons, Manifest - TBD)
│   └── package.json
│
└── docs/                 # Documentation (AGENT_MEMORY.md, AI_SETUP_GUIDE.md, dll)
```

---

## Key Features

### Phase 1: Core Feed & AI Integration (✅ Selesai)
- Infinite scroll feed.
- **Zero Seed Data:** Data sepenuhnya di-*generate* *on-demand* oleh AI ketika data habis.
- **Dynamic Domain Filtering:** Filter kategori muncul otomatis berdasarkan hasil ekstraksi kartu yang di-*generate* oleh AI.
- Dukungan *Multi-domain request* ke AI dengan presisi tinggi.
- Responsive design (mobile-first).

### Phase 2: PWA Features (TBD / Ready to PWA)
- Install to home screen (manifest.json).
- Offline support (cached feed menggunakan Service Worker).
- Background sync untuk sinkronisasi simpan kartu (*save/bookmark*).

### Phase 3: Enhanced (Future)
- Dark mode.
- Reading preferences (tingkat kesulitan baca).
- Export saved cards.
- Statistics dashboard.

---

## Development Approach

### Local Development (Current):
```text
Backend: localhost:3001
Frontend: localhost:3000
Database: PostgreSQL di Docker
AI: Nvidia NIM API
```

---

## Benefits of This Approach

1. **Faster Development** - 1 codebase, hot reload.
2. **AI-Driven Automation** - Tidak perlu capek membuat data manual, AI mengurus semuanya di latar belakang.
3. **PWA Support** - *Installable*, terasa seperti aplikasi *native* (segera diimplementasikan).
4. **Flexible Deployment** - Local atau cloud sesuai kebutuhan.
5. **No App Store** - Tidak perlu review, fees, atau approval.

---

## Offline Strategy (PWA - Planned)

**Service Worker akan cache:**
- Static assets (JS, CSS, images).
- Recent knowledge cards (IndexedDB).
- User preferences (localStorage).

**When offline:**
- Show cached feed.
- Indicate offline status.
- Queue saves untuk sync later.

**When online:**
- Sync pending saves.
- Fetch fresh content (Trigger AI jika perlu).
- Update cache.

---

## Estimated Timeline

### Week 1: Foundation (✅ Selesai)
- Setup Next.js & Express.
- Integrasi UI & Backend.
- Setup PostgreSQL Docker.

### Week 2: AI & Core Features (✅ Selesai)
- Implementasi *Infinite Scroll*.
- Integrasi Nvidia NIM API.
- Filter domain dinamis & sinkronisasi *frontend-backend*.

### Week 3: Polish & PWA (⏳ Menunggu Eksekusi)
- Add offline support & Service Worker.
- Configure install prompt (PWA Manifest).
- Performance optimization.

### Week 4: Testing & Deployment
- Deploy ke cloud / local network access.
- Document usage & memory.
