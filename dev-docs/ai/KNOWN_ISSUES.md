# KNOWN_ISSUES

> **Status:** DATA FILE — Update saat ada issue baru atau terselesaikan.
> **Purpose:** Catatan issue yang diketahui — mencegah agent berikutnya mengulang debug yang sama.
> **Related:** [RESOLVED.md](./RESOLVED.md) untuk issue yang sudah fixed.

---

## Open Issues

| # | Area | Issue | Impact | Status |
|---|------|-------|--------|--------|
| O4 | ... | Search ILIKE ... | RENDAH | Deferred |
| O5 | ... | Refresh token not rotated ... | RENDAH | Deferred |
| O6 | ... | SSE in-process ... | RENDAH | Acceptable (deferred) |
| O7 | ... | Hard delete ... | RENDAH | Deferred |

---

## Uncertainty Markers

- Assumption based on repository analysis: GitHub Actions CI/CD pipeline tidak aktif atau belum dikonfigurasi (file `.github/workflows/main.yml` perlu diverifikasi)
- Assumption based on repository analysis: `npm run build` di frontend belum pernah dijalankan/diverifikasi — status build tidak diketahui
- Assumption based on repository analysis: `next lint` belum pernah dijalankan — mungkin ada lint errors yang belum terdeteksi
- Assumption based on repository analysis: Registry container/package untuk Docker image belum di-setup (GitHub Container Registry atau Docker Hub)
