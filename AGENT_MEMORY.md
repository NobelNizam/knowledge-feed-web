# Knowledge Feed App - Agent Memory & Context

Berkas ini berfungsi sebagai "memori" bagi agen AI pada sesi percakapan (conversation) di masa mendatang untuk memahami arsitektur, fitur, dan konteks proyek secara keseluruhan tanpa harus membaca ulang kode satu per satu.

## 📌 Ikhtisar Proyek (Project Overview)
**Knowledge Feed App** adalah aplikasi web berbasis *infinite scroll* (seperti TikTok/Reels) yang bertujuan mengubah kebiasaan *scrolling* menjadi kegiatan edukatif. Aplikasi ini menyajikan **Knowledge Cards** (kartu pengetahuan/fakta singkat) secara terus-menerus. Sistem ini 100% ditenagai oleh *AI Generator* yang secara otomatis akan membuat konten baru apabila stok fakta di *database* sudah habis saat pengguna melakukan *scroll*.

## 🛠️ Tech Stack & Arsitektur
Proyek ini mengadopsi arsitektur *Monorepo* yang dibagi menjadi dua direktori utama: `backend` dan `web`.

### 1. Backend (`/backend`)
- **Framework:** Node.js dengan Express.js.
- **Database:** PostgreSQL (berjalan di dalam Docker Container `knowledge-feed-db`).
- **ORM:** Prisma (`@prisma/client`).
- **AI Generator:** Menggunakan Nvidia NIM API (terkonfigurasi dengan OpenAI SDK) menggunakan model bawaan `meta/llama-3.1-70b-instruct`.
- **Rute Penting:**
  - `src/routes/feed.js`: Menangani logika *infinite scroll*. Jika data di *database* kosong atau habis, rute ini akan otomatis memanggil `aiGenerator` untuk membuat 5 kartu baru.
  - `src/routes/knowledge.js`: Menangani pencarian kartu dan pemuatan daftar *domain* (kategori) yang dinamis.
  - `src/services/aiGenerator.js`: Berisi logika ekstraksi prompt JSON dan koneksi ke Nvidia API. Sudah dioptimasi agar kebal terhadap *markdown tagging* dan selalu menetapkan satu domain per kartu.
  - `src/workers/contentGenerator.js`: Skrip pekerja CLI untuk menghasilkan *feed* manual via perintah `npm run generate`.

### 2. Frontend (`/web`)
- **Framework:** Next.js 14 (App Router) & React.
- **Styling:** Tailwind CSS.
- **Perilaku Utama:**
  - Komponen utama berada di `app/page.tsx`.
  - Sistem filter *domain* (kategori) bekerja 100% dinamis. Saat halaman dimuat, *frontend* mengambil daftar kategori dari *backend*. Setiap kali fitur *Load More* merender kartu baru dari AI, *frontend* akan memindai kartu tersebut dan **otomatis menambahkan tombol filter baru** jika AI membuat kategori baru.
  - Fungsi *API Client* tersentralisasi di `lib/api.ts` menggunakan Axios.

## ⚙️ Cara Menjalankan Proyek (Dev Mode)
1. **Database:** Masuk ke folder `/backend` lalu jalankan `docker-compose up -d`.
2. **Backend Server:** Pastikan *environment variable* `NVIDIA_API_KEY` terisi di `/backend/.env`. Lalu jalankan `npm run dev`.
3. **Frontend Server:** Masuk ke folder `/web` lalu jalankan `npm run dev`. Aplikasi dapat diakses melalui `http://localhost:3000`.

## 📜 Logika Bisnis & Perilaku Khusus (Penting untuk AI)
- **Zero Seed Data:** Basis data saat ini sepenuhnya kosong di awal (`seed.js` telah dinonaktifkan). Ini disengaja. Seluruh konten murni di-*generate* *on-demand* oleh AI ketika pengguna pertama kali membuka aplikasi.
- **Penanganan Multi-Domain:** Pada fitur filter *frontend*, pengguna dapat mencentang lebih dari 1 kategori sekaligus. *Backend* akan meminta AI membuatkan kartu yang membahas domain-domain tersebut, **NAMUN** AI diinstruksikan secara tegas untuk mengklasifikasikan setiap 1 kartu ke tepat 1 *domain* saja agar fitur filter bekerja secara konsisten di tingkat *database*.
- **Parsing JSON:** Respons dari model LLM Nvidia NIM sering kali dibungkus tag *markdown*. Oleh karena itu, ekstraksi JSON di backend `aiGenerator.js` menggunakan *RegEx* yang ketat `match(/\[[\s\S]*\]/)` untuk mencegah `JSON parse error`.

## 🚧 Titik Pengembangan Selanjutnya (Next Steps)
Jika pengguna meminta pengembangan lebih lanjut, pertimbangkan untuk:
1. Menambahkan sistem Autentikasi Pengguna (Login/Register).
2. Menghidupkan fitur *User Preferences* (membaca *reading level*) yang sudah ada di skema Prisma namun belum diintegrasikan penuh ke generator AI.
3. Membuat AI mampu melakukan *web scraping* berita terbaru alih-alih sekadar mengandalkan pengetahuan dasar LLM.
4. Menambahkan indeks pada `domain` dan `createdAt` di Prisma (`@@index`) jika database sudah membengkak akibat generasi *infinite scroll*.
