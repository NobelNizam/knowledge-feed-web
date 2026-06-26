# Knowledge Feed Web App

Aplikasi web *infinite scroll* yang ditenagai oleh kecerdasan buatan (AI) untuk mengubah kebiasaan menggulir layar (*scrolling*) menjadi kegiatan yang edukatif. Aplikasi ini secara otomatis menciptakan kartu pengetahuan (knowledge cards) tanpa batas menggunakan kapabilitas **Nvidia NIM API** dengan arsitektur data tanpa biji awal (*Zero Seed Data*).

---

## 🚀 Quick Start

### 1. Backend Setup & AI Config

```bash
cd /home/bishamon/knowledge-feed-app/backend

# Copy environment file
cp .env.example .env
```
👉 **PENTING:** Buka file `backend/.env` dan masukkan `NVIDIA_API_KEY` Anda dari [build.nvidia.com](https://build.nvidia.com/).

```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Install dependencies
npm install

# Run database migration (Database akan kosong 100% tanpa seed data)
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Backend will run on: **http://localhost:3001**

### 2. Frontend Setup

```bash
cd /home/bishamon/knowledge-feed-app/web

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: **http://localhost:3000**

---

## 📂 Project Structure

```text
knowledge-feed-app/
├── backend/                 # Express API (100% AI-Driven)
│   ├── src/
│   │   ├── routes/         # API endpoints (Feed, Knowledge, User)
│   │   ├── services/       # AI Generator (Nvidia NIM Integration)
│   │   └── index.js        # Entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── docker-compose.yml  # PostgreSQL Docker
│
└── web/                    # Next.js app (Ready to PWA)
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx        # Feed UI & Dynamic Filter Logic
    │   └── globals.css
    ├── components/
    │   └── KnowledgeCard.tsx
    └── lib/
        └── api.ts          # API client
```

---

## 🔌 API Endpoints

### Feed
- `GET /api/feed` - Get feed (Paginated, akan men-trigger AI jika data habis)
- `POST /api/feed/personalized` - Get personalized feed (Multi-domain filter)

### Knowledge
- `GET /api/knowledge/:id` - Get single card
- `GET /api/knowledge/search` - Search cards
- `GET /api/knowledge/trending` - Get trending
- `GET /api/knowledge/domains` - Get dynamic domains

---

## ✨ Features

✓ **Zero Seed Data:** Database dimulai dari kosong. AI akan men-generate konten secara *on-demand*.
✓ **Infinite scroll feed:** *Scroll* tanpa henti dengan dukungan *auto-generation* dari AI.
✓ **Dynamic Domain Filtering:** Tombol filter kategori tercipta secara dinamis berdasarkan hasil yang dibuat oleh AI.
✓ **Multi-domain AI Generation:** AI pintar memisahkan kategori secara spesifik meski diminta men-generate 2 topik sekaligus.
✓ **Responsive design** (mobile-first).

---

## 💻 Tech Stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL (Docker)
- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **AI Integration:** Nvidia NIM API (`meta/llama-3.1-70b-instruct`)

---

## 📖 Documentation & Guides

Silakan baca dokumen berikut untuk panduan lebih lanjut:
1. `DESIGN.md` - Arsitektur aplikasi & roadmap menuju PWA.
2. `AGENT_MEMORY.md` - Memori agen khusus pengembangan AI (Single source of truth).
3. `AI_SETUP_GUIDE.md` - Panduan lengkap menghubungkan & mengganti model Nvidia NIM API.
4. `TESTING_GUIDE.md` - Langkah-langkah pengujian menyeluruh (Backend & Frontend).
5. `QUICK_START.md` - Setup super cepat.

---

## 🔧 Troubleshooting

### Port already in use
```bash
# Check what's using port 3001
lsof -i :3001
# Kill process if needed
kill -9 <PID>
```

### Database connection error
```bash
# Check if PostgreSQL is running
docker ps
# Restart if needed
docker-compose restart
```

### AI Gagal Parse JSON (Error 500 saat Load More)
Pastikan Anda sudah mengonfigurasi `NVIDIA_API_KEY` dengan format yang benar (`nvapi-...`) di dalam berkas `.env` pada folder `backend`.

---

Created: 2026-06-25 | Refactored: 2026-06-26
