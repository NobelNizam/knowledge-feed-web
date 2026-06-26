# 🧠 Knowledge Feed Web App

Aplikasi web inovatif bergaya *infinite scroll* (seperti TikTok/Reels) yang didesain khusus untuk mengubah kebiasaan menggulir layar (*scrolling*) menjadi kegiatan edukatif. 

Proyek ini menggunakan **Nvidia NIM API (Llama 3.1)** untuk menghasilkan (*generate*) kartu-kartu fakta menarik secara otomatis *(on-demand)* ketika Anda kehabisan konten untuk dibaca.

---

## ✨ Fitur Utama

- **Zero Seed Data:** Tidak ada data statis! 100% konten dihasilkan secara otomatis oleh AI ketika database kosong.
- **AI-Powered Infinite Scroll:** Terus gulir ke bawah untuk memicu AI membuat lebih banyak fakta baru secara *real-time*.
- **Dynamic Category Filters:** Tombol filter kategori (sejarah, sains, dsb.) akan tercipta secara otomatis sesuai dengan topik yang baru saja dibuat oleh AI.
- **Multi-Domain Targeting:** Ingin fakta yang memadukan dua topik? Centang beberapa kategori sekaligus dan AI akan meracik fakta yang presisi.

---

## 🚀 Cara Instalasi (Quick Start)

### Prasyarat
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/) (untuk database PostgreSQL)
- **Nvidia API Key** (Dapatkan secara gratis di [build.nvidia.com](https://build.nvidia.com/))

### 1. Kloning Repositori
```bash
git clone https://github.com/yourusername/knowledge-feed-web.git
cd knowledge-feed-web
```

### 2. Jalankan Database (Backend)
```bash
cd backend

# Nyalakan PostgreSQL via Docker
docker-compose up -d
```
👉 **SANGAT PENTING:** Buka file `backend/.env` dan tambahkan `NVIDIA_API_KEY` milik Anda. Jika tidak, aplikasi tidak akan bisa memunculkan konten apa pun!

```bash
# Install library & setup database
npm install
npx prisma migrate dev --name init

# Jalankan server backend (localhost:3001)
npm run dev
```

### 3. Jalankan Tampilan Depan (Frontend)
Buka tab terminal baru:
```bash
cd ../web

# Install library
npm install

# Jalankan server frontend
npm run dev
```

Aplikasi kini dapat diakses melalui **[http://localhost:3000](http://localhost:3000)**! 

> **Catatan:** Saat pertama kali dibuka, halaman mungkin akan melakukan *loading* selama 3-5 detik karena AI sedang bekerja keras meracik kartu pengetahuan pertama Anda dari nol. Selamat menikmati!

---

## 💻 Tech Stack
- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL
- **AI Engine:** Nvidia NIM API (`meta/llama-3.1-70b-instruct`)
