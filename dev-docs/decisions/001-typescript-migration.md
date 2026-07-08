# ADR 001 — TypeScript Migration for Backend

## Status

Accepted (implemented 2026-07)

---

## Context

Backend awalnya ditulis dalam CommonJS JavaScript (`.js`, `require()`). ARCHITECTURE.md mengklaim "Node.js + TypeScript" tapi realitanya berbeda. Backend memiliki 30+ file JS tanpa type safety. Frontend `web/` sudah TypeScript. Migrasi diperlukan untuk konsistensi stack, type safety, dan developer experience.

Alternatif: tetap CommonJS JS (lebih sederhana, no build step). Ditolak karena: type safety mengurangi bug, konsisten dengan frontend, dan `tsx` runtime memungkinkan no-build development.

---

## Decision

Backend dimigrasi ke TypeScript dengan:
- `tsconfig.json`: strict mode, `allowJs: true`, `noEmit: true` (runtime via `tsx`), `noImplicitAny: false` (transitional)
- Runtime: `tsx` (TypeScript execute) — tidak ada compilation step untuk development
- Production build: `tsc --outDir dist` + `node dist/index.js`
- Testing: `ts-jest` untuk Jest compatibility
- Module export: `export = router` (CommonJS compatibility)
- Pipeline imports: sementara `require()` dengan `any` cast (menunggu type resolution)

---

## Consequences

### Positive

- Type safety untuk seluruh backend (30 file)
- `tsc --noEmit` clean — zero type errors
- Konsisten dengan frontend TypeScript
- Autocomplete dan IntelliSense di editor

### Trade-offs

- Pipeline module masih di-import via `require()` (type safety hilang di boundary)
- `noImplicitAny: false` — transitional, harus di-tighten nanti
- `tsx` runtime ~2x lebih lambat startup dibanding plain Node.js

### Risks

- BullMQ + ioredis type conflicts — pakai `as any` cast untuk connection option
- `$executeRawUnsafe` vectors — type unknown, aman karena input internal
