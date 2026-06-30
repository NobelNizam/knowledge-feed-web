# Panduan Pengembangan untuk Agen AI (Antigravity)

Dokumen ini berisi aturan, arsitektur, dan petunjuk operasional khusus untuk membantu agen AI (seperti Antigravity) yang bekerja pada repositori **knowledge-feed-web** di percakapan berikutnya.

---

## 1. Arsitektur Proyek & Port Default

*   **Frontend (Next.js)**: 
    *   Direktori: [web/](file:///home/bishamon/proyek/knowledge-feed-web/web)
    *   Port: `3000` (dijalankan via `npm run dev`)
    *   URL lokal: `http://localhost:3000`
*   **Backend API (Express/Node.js)**: 
    *   Direktori: [backend/](file:///home/bishamon/proyek/knowledge-feed-web/backend)
    *   Port: `3001` (dijalankan via `npm run dev` atau `nodemon`)
    *   URL lokal: `http://localhost:3001`
    *   Health check endpoint tersedia di: `http://localhost:3001/health`
*   **Infrastruktur Database & Cache (Docker)**:
    *   **PostgreSQL (with pgvector)**: Port `5432` (`knowledge-feed-db`)
    *   **Redis**: Port `6379` (`knowledge-feed-redis`)
    *   **MinIO**: Ports `9000` & `9001` (`knowledge-feed-minio`)

---

## 2. Prosedur Startup

Sebelum menjalankan server web atau API, selalu periksa apakah port tersebut sudah digunakan atau server sudah aktif terlebih dahulu. **Jangan langsung menjalankan `npm run dev` tanpa pengecekan agar tidak terjadi konflik/tumpang tindih port.**

1.  **Periksa Status Port**:
    Gunakan perintah berikut untuk memeriksa apakah port `3000` (frontend Next.js) dan port `3001` (backend Express) sudah aktif digunakan atau belum:
    ```bash
    ss -tuln | grep -E '3000|3001'
    ```
    Jika port `3001` dalam keadaan LISTEN namun server crash atau Anda ingin me-restart-nya secara bersih, temukan PID proses Node lama dan matikan:
    ```bash
    lsof -i :3001
    kill <PID>
    ```
2.  **Verifikasi Kontainer Docker**:
    Gunakan `docker ps` untuk memastikan kontainer database/cache aktif. Jika kontainer mati, jalankan dengan perintah:
    ```bash
    cd backend && docker-compose up -d
    ```
3.  **Jalankan Server Backend** (Hanya jika port `3001` belum aktif):
    Jalankan server backend (Express + BullMQ Worker) terlebih dahulu di direktori `backend` menggunakan `npm run dev`.
4.  **Jalankan Server Frontend** (Hanya jika port `3000` belum aktif):
    Jalankan server frontend (Next.js) di direktori `web` menggunakan `npm run dev`.

---

## 3. Catatan Penting & Optimasi Lingkungan Sandbox

### A. Unduhan Font Google (Next.js Timeout)
*   **Isu**: File [layout.tsx](file:///home/bishamon/proyek/knowledge-feed-web/web/app/layout.tsx) memuat font `Inter` dari `next/font/google`. Karena lingkungan sandbox tempat agen AI dijalankan mungkin memiliki akses internet eksternal yang terbatas, Next.js akan mengalami timeout saat mengunduh font Google tersebut. Hal ini membuat kompilasi halaman awal melambat hingga **5-10 detik**.
*   **Solusi**: Agen AI berikutnya dapat menonaktifkan optimasi font eksternal ini jika diperlukan dengan menambahkan opsi `optimizeFonts: false` di berkas [next.config.js](file:///home/bishamon/proyek/knowledge-feed-web/web/next.config.js):
    ```javascript
    const nextConfig = {
      reactStrictMode: true,
      images: {
        domains: ['upload.wikimedia.org'],
      },
      // Tambahkan ini jika kompilasi terhambat oleh download Google Fonts
      optimizeFonts: false, 
    };
    ```

### B. Prisma & PostgreSQL PGVector
*   **Isu**: Kolom `embedding` bertipe `vector(1024)` pada tabel `document_chunks` tidak didukung secara native oleh Prisma ORM sehingga dikelola via raw SQL manual setelah inisialisasi migrasi:
    ```sql
    ALTER TABLE document_chunks ADD COLUMN embedding vector(1024);
    ```
*   **Tindakan**: Saat menjalankan perintah `npx prisma db push`, Prisma akan memberikan peringatan *data loss* terkait penghapusan kolom `embedding` ini. **Hati-hati** agar tidak menghancurkan kolom ini di database saat memperbarui skema, kecuali jika memang ingin melakukan reset schema penuh.

### C. Pengaturan API URL di Lingkungan Sandbox (.env.local)
*   **Isu**: Pengguna mungkin mengubah `NEXT_PUBLIC_API_URL` di berkas `web/.env.local` menjadi IP jaringan lokal (misal `http://192.168.100.14:3001/api`) untuk keperluan pengujian via smartphone. Namun, IP eksternal ini tidak dapat diakses dari dalam lingkungan sandbox terisolasi tempat agen AI dijalankan.
*   **Tindakan**: Saat mendiagnosis kegagalan koneksi API frontend/backend di lingkungan sandbox, pastikan `NEXT_PUBLIC_API_URL` dikembalikan ke `http://localhost:3001/api`. Informasikan pengguna mengenai hal ini jika mereka ingin mengujinya di smartphone.

### D. Parameter Input NVIDIA NIM Embedding API
*   **Isu**: API NVIDIA NIM `/embeddings` (misal model `nvidia/nv-embedqa-e5-v5`) akan mengembalikan error HTTP 500 (`Unexpected error: pinned input buffer H2D: failed to perform CUDA copy`) jika parameter `input` dikirimkan berupa string tunggal (`string`). API ini mewajibkan parameter `input` berupa array of strings (`string[]`).
*   **Tindakan**: Selalu bungkus teks input ke dalam format array (`Array.isArray(input) ? input : [input]`) sebelum dikirimkan ke endpoint API NVIDIA NIM.

### E. Inisialisasi Prisma Client di Backend
*   **Tindakan**: Jangan mengimpor prisma dari file library lokal yang tidak ada (seperti `../lib/prisma`). Selalu gunakan impor standar PrismaClient di backend routes/controllers:
    ```javascript
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    ```

### F. Optimasi Kueri Sosial di Feed (Pola Batch Query)
*   **Isu**: Menampilkan metadata interaksi (likeCount, liked status, commentsCount) untuk banyak kartu di feed rawan isu 1+N query jika dilakukan dalam per-looping.
*   **Tindakan**: Lakukan batching query secara paralel menggunakan `Promise.all` dan operator `in` di Prisma:
    ```javascript
    const cardIds = cards.map(c => c.id);
    const [likes, userLikes, comments] = await Promise.all([
      prisma.like.groupBy({ by: ['cardId'], where: { cardId: { in: cardIds } }, _count: { id: true } }),
      userId ? prisma.like.findMany({ where: { userId, cardId: { in: cardIds } } }) : [],
      prisma.comment.groupBy({ by: ['cardId'], where: { cardId: { in: cardIds } }, _count: { id: true } })
    ]);
    ```
    Petakan hasil query tersebut menggunakan Map/Set di memori sebelum mengembalikan response JSON.

