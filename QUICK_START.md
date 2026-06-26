# Quick Start Guide - Knowledge Feed Web App

## Status: READY FOR TESTING

---

## MANUAL SETUP (Recommended)

### Step 1: Start Database (Docker)
```bash
cd /home/bishamon/knowledge-feed-app/backend
docker-compose up -d
```

### Step 2: Setup Backend & AI
```bash
# Copy environment
cp .env.example .env
```
👉 **PENTING:** Buka file `backend/.env` dan masukkan `NVIDIA_API_KEY` Anda agar AI generator dapat berfungsi.

```bash
# Install dependencies
npm install

# Run database migration
npx prisma migrate dev --name init

# Start server
npm run dev
```

Backend will run on: http://localhost:3001

### Step 3: Setup Frontend
```bash
cd /home/bishamon/knowledge-feed-app/web

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will run on: http://localhost:3000

---

## WHAT TO EXPECT

### Backend API Endpoints:
- GET http://localhost:3001/health
- GET http://localhost:3001/api/feed (Auto-triggers AI if empty)
- GET http://localhost:3001/api/knowledge/domains

### Frontend:
- Open http://localhost:3000 in browser.
- **Zero Seed Data:** Awalnya halaman akan melakukan loading selama 3-5 detik karena AI sedang men-generate *knowledge cards* pertama secara on-demand.
- Setelah data termuat, filter kategori (domain) akan otomatis muncul.
- Klik "Load More" untuk memicu AI membuat lebih banyak konten baru!

---

## FILES CREATED:

Backend: Express API + PostgreSQL + Nvidia NIM Integration
Frontend: Next.js app (Ready to PWA)
Documentation: AGENT_MEMORY.md, AI_SETUP_GUIDE.md, DESIGN.md
