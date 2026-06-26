# Testing Guide - Knowledge Feed Web App

## Prerequisites

1. Docker Desktop installed
2. Node.js 18+ installed
3. npm or yarn
4. Nvidia API Key (from build.nvidia.com)

---

## Step 1: Start PostgreSQL

```bash
cd /home/bishamon/knowledge-feed-app/backend

# Start PostgreSQL container
docker-compose up -d

# Verify container is running
docker ps
```

Expected output: Container named "knowledge-feed-db" running

---

## Step 2: Setup Backend
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (tidak ada data dummy lagi, db akan kosong)
npx prisma migrate dev --name init

# Start server
npm run dev
```

Backend running on: http://localhost:3001

---

## Step 3: Test Backend API & CLI

Open browser or use curl:

```bash
# Health check
curl http://localhost:3001/health

# Coba generate 2 kartu secara manual via CLI (Opsional)
npm run generate 2
```

---

## Step 4: Setup Frontend

```bash
cd /home/bishamon/knowledge-feed-app/web

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend running on: http://localhost:3000

---

## Step 5: Test Web Feed (The AI Magic)

1. Open browser: http://localhost:3000
2. **Perhatikan:** Layar akan *loading* selama beberapa detik. Ini karena database sedang kosong dan Frontend sedang meminta Backend untuk memicu Nvidia AI meng-generate 5 kartu baru!
3. Setelah *loading* selesai, 5 kartu pengetahuan akan muncul.
4. **Perhatikan:** Tombol filter kategori (domain) akan otomatis tercipta berdasarkan kategori apa yang baru saja dihasilkan oleh AI.
5. Klik "Load More". Tunggu beberapa detik, AI akan otomatis membuat 5 kartu lagi.
6. Coba centang 1 atau 2 filter kategori secara bersamaan, lalu klik "Load More". AI akan membuat kartu **khusus** untuk kategori yang Anda centang saja!

---

## Troubleshooting

### AI Gagal Parse JSON (Error 500 saat Load More)
Backend sudah dilengkapi dengan Regex extractor yang kuat di `aiGenerator.js`. Jika masih *error*, pastikan Anda sudah memasukkan `NVIDIA_API_KEY` yang benar.

### PostgreSQL won't start
```bash
# Check logs
docker-compose logs

# Restart
docker-compose restart
```

### CORS errors
Backend already configured with CORS for localhost:3000

---

## Success Criteria

- [ ] PostgreSQL running in Docker
- [ ] Backend API responds on port 3001
- [ ] Nvidia NIM API Key configured
- [ ] Frontend loads on port 3000
- [ ] Feed triggers AI generation successfully when empty (Zero Seed Data test)
- [ ] Domain filtering buttons dynamically generated
- [ ] Infinite scroll triggers new AI generation