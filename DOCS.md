# Dokumentasi Teknis Knowledge Feed Web

Sistem web agregator informasi terpersonalisasi yang ditenagai oleh AI, RAG (Retrieval-Augmented Generation), dan analisis berbasis klaster pengetahuan ilmiah. Proyek ini terbagi menjadi backend API Express (Node.js) dan frontend aplikasi Next.js 14 (App Router).

---

## 1. Arsitektur Sistem Tingkat Tinggi

Diagram berikut menjelaskan aliran data lengkap dari proses pengambilan dokumen ilmiah eksternal hingga penyajian kartu pengetahuan terpersonalisasi di browser pengguna:

```mermaid
graph TD
    subgraph Data Pipeline (RAG)
        C[Crawler arXiv] -->|Ambil XML| CL[Cleaner]
        CL -->|Bersihkan Teks & LaTeX| CH[Chunker]
        CH -->|Pemisahan Paragraf| EM[Embedder NVIDIA NIM]
        EM -->|Vektor 1024-dim| VS[(Vector Store pgvector)]
    end

    subgraph RAG & Content Generation
        VS -->|Pencarian Vektor| RT[Retriever]
        RT -->|Konteks Relevan| GEN[AI Generator Gemini]
        GEN -->|Draft Knowledge Card| FC[Fact Checker]
        FC -->|Verifikasi PubMed/CrossRef| MOD[Moderator]
        MOD -->|Penyaringan Konten| PUB[Publisher]
        PUB -->|Simpan ke PostgreSQL| DB[(PostgreSQL)]
        PUB -->|Invalidasi Cache| RED[(Redis Cache)]
    end

    subgraph User Interaction
        UI[Frontend Next.js 14] -->|Request HTTP Fetch| API[Backend Express API]
        API -->|Kueri Cache/DB| RED
        API -->|Verifikasi Sesi| JWT[JWT Auth Cookie]
        DB -->|Kueri Data Denormalisasi| API
    end
```

---

## 2. Port Default & Lingkungan Infrastruktur

Sistem dijalankan menggunakan Docker Compose di backend untuk mempermudah penyediaan database dan cache.

| Layanan | Direktori | Port Lokal | Detail |
| :--- | :--- | :--- | :--- |
| **Frontend (Next.js)** | `/web` | `3000` | Diaktifkan via `npm run dev` |
| **Backend API (Express)** | `/backend` | `3001` | Diaktifkan via `npm run dev` atau `nodemon` |
| **PostgreSQL (pgvector)** | `/backend` | `5432` | Nama container: `knowledge-feed-db` |
| **Redis Cache** | `/backend` | `6379` | Nama container: `knowledge-feed-redis` |
| **MinIO Object Store** | `/backend` | `9000` & `9001` | Nama container: `knowledge-feed-minio` |

### Variabel Environment Penting (`.env`)

#### Backend (`/backend/.env`)
*   `DATABASE_URL`: URI koneksi PostgreSQL (`postgresql://...`).
*   `REDIS_URL`: URI koneksi Redis (`redis://localhost:6379`).
*   `JWT_SECRET` & `JWT_REFRESH_SECRET`: Kunci enkripsi token otentikasi.
*   `NVIDIA_API_KEY`: Token API untuk NVIDIA NIM Embeddings.
*   `GEMINI_API_KEY`: Kunci API Google AI (Gemini) untuk Content Generation.
*   `NCBI_API_KEY`: (Opsional) Token API PubMed NCBI untuk validasi klaim.

#### Frontend (`/web/.env.local`)
*   `NEXT_PUBLIC_API_URL`: Alamat dasar API Backend (default: `http://localhost:3001/api` atau `/api` jika di belakang proxy/tunnel).

---

## 3. Dokumentasi Direktori & Berkas Lengkap

### 📁 Root Proyek
*   [ARCHITECTURE.md](file:///home/bishamon/proyek/knowledge-feed-web/ARCHITECTURE.md): Catatan desain keputusan arsitektur dan pola integrasi data pipeline.
*   [DomainKnowledge.md](file:///home/bishamon/proyek/knowledge-feed-web/DomainKnowledge.md): Klasifikasi hierarki topik 3-level (Discipline -> Domain -> Subtopic) untuk personalisasi feed.
*   [AUDIT.md](file:///home/bishamon/proyek/knowledge-feed-web/AUDIT.md): Laporan audit performa, dead-code, dan rencana refactoring sistem.
*   [README.md](file:///home/bishamon/proyek/knowledge-feed-web/README.md): Petunjuk cepat instalasi dan cara menjalankan proyek.

---

### 📁 Backend API (`/backend`)

#### Direktori `/backend/prisma`
*   [schema.prisma](file:///home/bishamon/proyek/knowledge-feed-web/backend/prisma/schema.prisma): Pendefinisian skema database relasional (User, UserPreferences, KnowledgeCard, Like, View, Comment, Document, DocumentChunk).
*   [seed.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/prisma/seed.js): Skrip pengisian data awal untuk pengembangan (migrasi default admin dan kartu sampel).

#### Direktori `/backend/src`
*   [index.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/index.js): Entry point Express API. Menginisialisasi middleware global (CORS terproteksi, Helmet, Rate Limiter) dan routing.

#### Direktori `/backend/src/lib` (Core Utiliti)
*   [prisma.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/lib/prisma.js): Wrapper singleton Prisma Client untuk menghindari kehabisan koneksi pool (*pool exhaustion*).
*   [jwtSecrets.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/lib/jwtSecrets.js): Konfigurasi runtime secret JWT.
*   [logger.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/lib/logger.js): Minimal helper logging terpusat dengan format timestamps.

#### Direktori `/backend/src/middleware`
*   [auth.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/middleware/auth.js): Middleware verifikasi otentikasi JWT dari cookie aman `token`.
*   [admin.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/middleware/admin.js): Middleware proteksi rute khusus administrator.

#### Direktori `/backend/src/pipeline` (Modul RAG Pipeline)
*   [crawler.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/crawler.js): Mengambil data dokumen ilmiah dari arXiv API menggunakan `fetch` native dengan timeout request 5 detik.
*   [cleaner.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/cleaner.js): Menormalisasi teks mentah, menghapus format LaTeX, kode HTML, dan pembersihan spasi.
*   [chunker.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/chunker.js): Pemisah dokumen menjadi potongan teks (*chunks*) logis berbasis kalimat dengan estimasi batas token.
*   [embedder.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/embedder.js): Wrapper integrasi NVIDIA NIM Embedding API untuk menghasilkan vektor representasi teks.
*   [vectorStore.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/vectorStore.js): Antarmuka penyimpanan dan pencarian vektor cosine similarity memanfaatkan ekstensi `pgvector` PostgreSQL.
*   [retriever.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/retriever.js): Mengambil chunk dokumen yang relevan dari Vector DB berdasarkan query klaster topik.
*   [factChecker.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/factChecker.js): Melakukan verifikasi silang (*cross-reference*) otomatis terhadap klaim AI menggunakan API CrossRef & PubMed.
*   [moderator.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/moderator.js): Pemeriksaan otomatis berbasis *blacklist keywords* dan pemindaian panjang konten.
*   [publisher.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/pipeline/publisher.js): Mengubah draf hasil moderasi menjadi kartu pengetahuan formal di database dan membersihkan Redis cache global.

#### Direktori `/backend/src/queue` (Pengelolaan Kerja Latar)
*   [queueManager.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/queue/queueManager.js): Konfigurasi asinkron antrean BullMQ Redis (`CONTENT_PIPELINE`).

#### Direktori `/backend/src/routes` (Rute Express API)
*   [auth.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/routes/auth.js): Registrasi pengguna baru, otentikasi login, logout (pembersihan kuki), dan penyegaran token sesi `/refresh` yang aman.
*   [feed.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/routes/feed.js): Memuat timeline feed (umum/terpersonalisasi) dengan helper interaksi terpadu, penyegaran manual, dan SSE stream refresh.
*   [knowledge.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/routes/knowledge.js): Rute pencarian kartu, daftar trending topik, pembacaan detail kartu tunggal berbasis `saveCount` denormalisasi.
*   [user.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/routes/user.js): Penyimpanan data profil pengguna, pembaharuan preferensi topik dengan validasi input array, dan aksi simpan/bookmark kartu.
*   [admin.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/routes/admin.js): Dasbor moderator untuk menyetujui/menolak draf kartu.
*   [generate.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/routes/generate.js): Triger manual bagi administrator untuk memicu asinkron RAG pipeline.

#### Direktori `/backend/src/services`
*   [aiGenerator.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/services/aiGenerator.js): Integrasi Google Generative AI (Gemini Pro) untuk menyusun konten informatif dari konteks ilmiah hasil pencarian vektor.
*   [cacheService.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/services/cacheService.js): Implementasi Redis cache untuk domain feed dengan nilai CACHE_TTL yang dioptimalkan (900 detik / 15 menit).
*   [domainHierarchy.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/services/domainHierarchy.js): Pemetaan relasi topik berbasis Domain Knowledge.

#### Direktori `/backend/src/tests` (Unit Testing)
*   [auth.test.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/tests/auth.test.js): Pengujian rute register, login, refresh token, dan penanganan kegagalan sesi.
*   [feed.test.js](file:///home/bishamon/proyek/knowledge-feed-web/backend/src/tests/feed.test.js): Pengujian performa query rute feed timeline dan filtering domain.

---

### 📁 Aplikasi Frontend Next.js (`/web`)

#### Direktori `/web/app` (Next.js Pages)
*   [layout.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/layout.tsx): Kerangka dasar HTML, pengisian font inter, dan wrapper context.
*   [page.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/page.tsx): Halaman beranda utama yang menampilkan timeline kartu pengetahuan terpersonalisasi, filter cepat, dan pull-to-refresh.
*   [login/page.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/login/page.tsx) & [register/page.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/register/page.tsx): Antarmuka otentikasi akun.
*   [admin/page.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/admin/page.tsx): Dasbor kelola draf hasil moderasi kartu untuk admin.
*   [card/[id]/page.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/card/[id]/page.tsx): Halaman detail kartu yang memuat metadata AI model, sitasi paper ilmiah asli (CrossRef/PubMed), dan interaksi komentar.
*   [profile/page.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/profile/page.tsx) & [profile/settings/page.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/profile/settings/page.tsx): Pengaturan akun, avatar, dan edit preferensi topik.
*   [search/page.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/search/page.tsx): Antarmuka pencarian dokumen.

#### Direktori `/web/components` (Reusable Components)
*   [AdminGuard.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/AdminGuard.tsx): HOC (Higher-Order Component) pembatas rute halaman admin.
*   [OnboardingView.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/OnboardingView.tsx): Dialog pemilihan topik pertama kali bagi pengguna baru.
*   `cards/`:
    *   [KnowledgeFeedCard.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/cards/KnowledgeFeedCard.tsx): Kartu individual dengan tombol interaksi interaktif (Like, Comment, Share, Bookmark).
    *   [SkeletonCard.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/cards/SkeletonCard.tsx): Placeholder visual saat data feed sedang dimuat (*loading state*).
*   `shared/`: Layouting statis berupa sidebar menu ([LeftSidebar.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/shared/LeftSidebar.tsx)), bottom navigasi mobile ([Bottombar.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/shared/Bottombar.tsx)), topbar pencarian ([Topbar.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/shared/Topbar.tsx)), panel kategori ([RightFilterPanel.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/shared/RightFilterPanel.tsx)), dan tombol tema ([ThemeToggle.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/components/shared/ThemeToggle.tsx)).
*   `ui/`: Komponen styling murni shadcn/radix (button, separator).

#### Direktori `/web/hooks`
*   [useFeedState.ts](file:///home/bishamon/proyek/knowledge-feed-web/web/hooks/useFeedState.ts): Custom React hook untuk mengelola state pagination feed, pull-to-refresh, SSE connection, dan update interaksi lokal (*optimistic updates*).

#### Direktori `/web/lib`
*   [api.ts](file:///home/bishamon/proyek/knowledge-feed-web/web/lib/api.ts): API client dengan wrapper `fetch` native Next.js 14 yang mendukung `credentials: 'include'` agar kuki aman otentikasi dapat dipertahankan melalui Cloudflare Tunnel.
*   [AuthContext.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/lib/AuthContext.tsx): Context provider status login pengguna dan penyimpanan profil sesi.
*   [FilterContext.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/lib/FilterContext.tsx): Context provider status filter kategori aktif.
*   [domainMapping.ts](file:///home/bishamon/proyek/knowledge-feed-web/web/lib/domainMapping.ts): Konfigurasi pemetaan visual warna dan ikon berdasarkan rumpun topik keilmuan.

---

## 4. Optimalisasi Kode & Dead Code (Audit Selesai)

Sebagai bagian dari komitmen menjaga kesederhanaan dan kemudahan pemeliharaan (*maintainability*), berkas-berkas berikut telah **DIHAPUS** sepenuhnya dari repositori:
1.  `backend/test-vector.js` (Berkas uji coba manual temporer).
2.  `web/stories/` (Seluruh isi direktori contoh Storybook boilerplate dibersihkan karena tidak terpakai).
3.  Library `axios` pada backend dihapus dan digantikan sepenuhnya oleh native `fetch` API dengan AbortController untuk performa koneksi yang optimal.
