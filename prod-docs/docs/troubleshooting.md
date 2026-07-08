# Troubleshooting — Knowledge Feed Web

> **Last Updated:** 2026-07-08

---

## Common Issues

### 1. Render Cold Start (30 detik delay)

**Symptom**: User pertama setelah idle 15+ menit dapat response lambat.

**Cause**: Render free tier sleep.

**Solution**: Setup UptimeRobot ping ke `/health` tiap 14 menit.

---

### 2. Backend Return 5xx

**Diagnosis**:
```bash
# Cek Render logs
# Render Dashboard → bishamonback → Logs

# Cek health
curl https://bishamonback.onrender.com/health
```

**Common causes**:
- NVIDIA_API_KEY expired / invalid
- Neon connection timeout (check DATABASE_URL)
- Upstash Redis unavailable (queue/cache errors logged but non-fatal)
- Out of memory (Render free tier RAM limit)

---

### 3. Feed Kosong / Tidak Ada Kartu

**Diagnosis**:
```bash
# Cek apakah ada kartu di DB
curl https://bishamonback.onrender.com/api/knowledge/domains

# Trigger pipeline manual
curl -X POST https://bishamonback.onrender.com/api/feed/refresh \
  -H "Cookie: token=..." \
  -H "Content-Type: application/json" \
  -d '{"filterType":"all","filterValue":"Semua"}'
```

**Solution**: Jika 0 kartu → trigger pipeline. Pastikan NVIDIA_API_KEY valid.

---

### 4. CORS Error di Browser

**Symptom**: Console: "Access to fetch ... has been blocked by CORS policy"

**Cause**: FRONTEND_URL di Render tidak match dengan domain Vercel.

**Solution**: Cek `FRONTEND_URL=https://bishamon.vercel.app` di Render dashboard.

---

### 5. Login / Auth Gagal

**Symptom**: 401 Unauthorized, token tidak valid.

**Diagnosis**:
```bash
# Test login
curl -X POST https://bishamonback.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"..."}'
```

**Common causes**:
- JWT_SECRET / REFRESH_TOKEN_SECRET beda antara deployment
- Cookie tidak terkirim (cek `secure: true` + HTTPS)
- Session expired

---

### 6. Pipeline Tidak Jalan

**Symptom**: Feed refresh return 503 atau timeout.

**Diagnosis**: Cek Render logs untuk error BullMQ/Redis.

**Common causes**:
- Upstash Redis unavailable (cek Upstash dashboard)
- NVIDIA NIM API rate limited (cek usage di build.nvidia.com)
- arXiv API timeout (network issue)
