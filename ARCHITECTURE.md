# Wise Scrolling Platform Architecture

## AI-Powered Educational Social Platform

> **Visi**
>
> Membangun platform seperti Twitter/Threads yang mengubah *doom scrolling* menjadi *wise scrolling*, di mana pengguna tetap menikmati pengalaman scrolling namun seluruh kontennya merupakan hasil generasi AI yang berisi ilmu pengetahuan dari berbagai disiplin ilmu berdasarkan sumber terpercaya (*Single Source of Truth / SSOT*).

---

# 1. Tujuan Sistem

Platform memiliki karakteristik berikut:

* Timeline seperti Twitter/Threads
* Konten hanya berupa teks
* Seluruh posting dihasilkan AI
* Seluruh posting memiliki referensi terpercaya
* Pembelajaran berlangsung secara natural melalui scrolling
* Personalisasi berdasarkan minat pengguna
* Gratis dan dapat dikembangkan oleh solo developer

---

# 2. Arsitektur Tingkat Tinggi

```text
                         USER
                           │
                           ▼
                     Web Browser
                           │
                           ▼
                      Next.js Frontend (Vercel)
                           │
─────────────────────────┼──────────────────────────
                           │
                     Authentication
                           │
                           ▼
                    Backend API Server (Node.js/TS)
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    Feed Service     User Service    Search Service
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                   AI Content Service
                           │
─────────────────────────┼──────────────────────────
                           │
                     Knowledge Pipeline
                           │
      Trusted Sources → Cleaning → Chunk → Embed → Vector Store → RAG → LLM → Fact‑Check → Moderation → Publish
                           │
                     PostgreSQL Database
                           │
           Redis Cache + MinIO Object Storage
                           │
─────────────────────────┼──────────────────────────
                           │
         Monitoring • Logging • Backup • CI/CD (GitHub Actions)
```

---

# 3. Layer Architecture

## Layer 1 — Presentation Layer

**Fungsi**
* Menampilkan timeline
* Infinite scrolling
* Login (Email & Password)
* Profile
* Search (keyword)
* Bookmark
* Like
* Comment

**Tech Stack**
* Next.js (deployed on Vercel)
* React
* Tailwind CSS
* TypeScript

---

## Layer 2 — Authentication & Authorization

**Authentication**
* Email + Password (bcrypt hashed)
* Session stored in HttpOnly cookies, JWT access token (15 min) + refresh token (7 days)

**Authorization**
* Role‑based: User, Admin
* Admin capabilities:
  - Meng‑aktifkan/menonaktifkan pipeline AI
  - Mengatur konfigurasi fact‑check atau sumber terpercaya
  - Melihat jumlah akun user yang terbuat dan jumlah online
  - Menghapus konten feed tertentu
  - Melihat inbox report dari user untuk investigasi keluhan user

---

## Layer 3 — API Layer

* REST + GraphQL (feed queries)
* Versioned `/api/v1/...`

---

## Layer 4 — Business Logic

* Generate feed (cached per‑user)
* Ranking & recommendation (simple collaborative + knowledge‑graph based)
* Learning engine (track reading history, build personal knowledge graph)
* Like, Bookmark, Follow, Comment
* Search (keyword based on PostgreSQL full‑text)

---

## Layer 5 — AI Content Layer

* Open‑source LLM via NVIDIA **NIM** (model chosen based on availability, e.g., Mistral‑7B)
* Prompt templates include citation placeholders
* Retrieval‑Augmented Generation using PGVector embeddings
* Fact‑Check using CrossRef, PubMed, arXiv, official documentation, scientific journals
* Fully automated moderation (toxicity classifier, policy rules)
* Publish verified post to feed

---

## Layer 6 — Knowledge Pipeline (SSOT)

* **Trusted Sources**: Paper ilmiah, buku, dokumentasi resmi, organisasi internasional, pemerintah, universitas, arXiv, CrossRef, PubMed
* **Pipeline**:
  ```
  Trusted Sources → Crawler/API → Cleaning → Deduplicate → Chunking → Embedding → Vector Store (PGVector) → Retriever → Context Builder → LLM → Fact‑Check → Moderation → Publish
  ```
* All processing runs asynchronously via **BullMQ** queue workers

---

## Layer 7 — Database Layer

* PostgreSQL (primary + read replica for scaling)
* Schemas: users, profiles, posts, post_versions, likes, bookmarks, comments, follows, learning_progress, knowledge_graph, audit_log
* ORM: Prisma
* Vector extension: PGVector for embeddings

---

## Layer 8 — Search Layer

* Keyword search using PostgreSQL full‑text search (tsvector)
* Future road‑map includes semantic vector search

---

## Layer 9 — Cache Layer

* Redis (per‑user feed cache, session store, rate‑limit counters)
* TTL 5 minutes for feed, refresh on new post generation

---

## Layer 10 — Queue Layer

* BullMQ (Redis‑backed) for background jobs:
  * Content generation
  * Fact‑check
  * Moderation
  * Notification dispatch

---

## Layer 11 — Object Storage

* MinIO (S3‑compatible) for avatars, static assets

---

## Layer 12 — CDN

* Cloudflare (free tier) for static asset delivery

---

## Layer 13 — Monitoring

* **Tidak diperlukan** pada tahap MVP; akan ditambahkan pada fase Production Ready

---

## Layer 14 — Logging

* **Tidak diperlukan** pada tahap MVP; akan ditambahkan pada fase Production Ready

---

## Layer 15 — Deployment

* **Vercel** untuk Next.js Frontend (auto‑scaling, global edge)
* Docker containers for backend API, AI service, and queue workers (deployed via GitHub Actions to Vercel Serverless Functions or a low‑cost VPS if needed)
* CI/CD pipeline (GitHub Actions) runs lint, unit tests, builds Docker images, pushes to GitHub Container Registry, and deploys automatically on merge to `main`

---

## Layer 16 — Backup & Recovery

* Daily logical dump of PostgreSQL stored in MinIO (retention 30 days)
* WAL archiving optional for point‑in‑time recovery (future enhancement)

---

# 4. Infrastruktur (Infrastructure Architecture)

```text
Developer
   ↓
Git
   ↓
GitHub
   ↓
GitHub Actions
   ↓
Docker Build
   ↓
Vercel (Frontend) & VPS/Serverless (Backend)
   ↓
Nginx (optional reverse proxy for API)
   ↓
PostgreSQL & Redis
   ↓
MinIO Object Storage
   ↓
Monitoring (future)
```

---

# 5. AI Knowledge Pipeline (Inti Platform)

```text
Trusted Sources → Crawler/API → Cleaning → Deduplicate → Chunk → Embed → Vector Store → Retriever → Context Builder → LLM (NVIDIA NIM) → Fact‑Check (CrossRef, PubMed, arXiv) → Moderation → Publish
```

---

# 6. Learning Engine (Pembeda Utama)

* Membangun **Knowledge Graph** pribadi tiap pengguna berdasarkan riwayat membaca
* Menghubungkan topik terkait, menyesuaikan tingkat kesulitan, dan menerapkan *spaced repetition*
* Rekomendasi topik lanjutan berdasarkan progress graph

---

# 7. Rekomendasi Tech Stack (100 % Gratis & Open Source)

## Frontend
* Next.js (Vercel)
* React
* Tailwind CSS
* TypeScript

## Backend
* Node.js + TypeScript (API Routes)
* Prisma ORM
* BullMQ (queue)
* Redis
* PostgreSQL + PGVector
* MinIO (object storage)
* Nginx (reverse proxy, optional)

## AI
* Open‑source LLM via NVIDIA NIM (GPU container)
* Embedding models (sentence‑transformers) running on same GPU pool

## DevOps
* GitHub Actions CI/CD
* Docker
* Vercel for frontend, Serverless/VPS for backend

---

# 8. Tahapan Pengembangan (Roadmap)

## Phase 1 — MVP
* Authentication (email & password)
* Timeline UI
* AI Post generation (NIM LLM, simple RAG)
* Keyword Search
* Bookmark & Like
* Per‑user feed cache (Redis)
* Daily backup to MinIO

**Target:** Membuat aplikasi yang sudah dapat digunakan.

---

## Phase 2 — Production Ready
* Redis cache layer (enhanced TTL & eviction policies)
* Docker containerisation for all services
* CI/CD with automated tests, linting, security scans
* Monitoring (Prometheus + Grafana) & Logging (Loki) – optional but recommended for production
* Backup strategy refinement (WAL archiving)

---

## Phase 3 — Intelligent Platform
* Full Knowledge Pipeline with deduplication & chunking
* Advanced RAG + Fact‑Check integration (CrossRef, PubMed, arXiv)
* Knowledge Graph based learning engine
* Semantic search (vector search) – future enhancement

---

## Phase 4 — Scalability
* Queue scaling (multiple BullMQ workers on GPU nodes)
* CDN for static assets (Cloudflare)
* Load balancer & horizontal scaling of API services
* Multi‑region deployment (Vercel edge, optional backend regions)

---

# 9. Catatan Penting

Secara teknis, proyek ini **sangat memungkinkan** dikerjakan oleh seorang solo full‑stack developer dengan memanfaatkan teknologi open source dan layanan gratis untuk tahap awal. Tantangan terbesar tetap pada kualitas konten AI; prioritas utama adalah membangun **Knowledge Pipeline** yang kuat, melakukan fact‑check, dan mengembangkan **Knowledge Graph** untuk personalisasi belajar adaptif.
