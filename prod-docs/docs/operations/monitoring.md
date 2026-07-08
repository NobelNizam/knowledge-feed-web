# Monitoring & Alerting — Knowledge Feed Web

> **Last Updated:** 2026-07-08

---

## Current State

Belum ada monitoring formal. Satu-satunya yang direkomendasikan:

---

## Uptime Monitoring (Render Anti-Sleep)

**UptimeRobot** (gratis):
- URL: `https://bishamonback.onrender.com/health`
- Interval: 14 menit
- Tipe: HTTP(s) — keyword: `"status":"ok"`

Tanpa ini, Render free tier tidur setelah 15 menit idle dan user pertama kena cold start ~30 detik.

---

## Health Check Endpoint

```
GET https://bishamonback.onrender.com/health
```

Response:
```json
{"status":"ok","timestamp":"2026-07-08T...","service":"Knowledge Feed API"}
```

---

## Platform Dashboards

| Platform | Dashboard | Yang Dimonitor |
|----------|-----------|---------------|
| Vercel | https://vercel.com/dashboard | Deploy status, traffic, errors |
| Render | https://dashboard.render.com | Backend logs, CPU/memory, uptime |
| Neon | https://console.neon.tech | Query performance, storage, connections |
| Upstash | https://console.upstash.com | Redis memory, commands count |
| NVIDIA | https://build.nvidia.com | API usage, rate limits |

---

## Future: Production-Grade Monitoring

| Tool | Purpose | Priority |
|------|---------|----------|
| UptimeRobot | Uptime + anti-sleep | SEKARANG |
| Sentry | Error tracking (frontend + backend) | Nanti |
| Prometheus + Grafana | Metrics + dashboards | Nanti |
| Loki | Structured logging | Nanti |
