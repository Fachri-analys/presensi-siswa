# Dokumentasi Sistem Presensi Siswa

Dokumentasi spesifikasi produk, sistem, arsitektur, dan integrasi API untuk Sistem Presensi Siswa SMK Negeri 11 Jakarta.

| Dokumen | Tujuan |
|---|---|
| [PROJECT-MAP.md](./PROJECT-MAP.md) | Peta direktori, lapisan aplikasi, alur utama, dan titik integrasi. |
| [PRD.md](./PRD.md) | Tujuan produk, persona pengguna, ruang lingkup, alur utama, dan aturan bisnis presensi. |
| [SRS.md](./SRS.md) | Persyaratan sistem fungsional, nonfungsional, keamanan, dan kriteria penerimaan. |
| [API-CONTRACT.md](./API-CONTRACT.md) | Spesifikasi lengkap resource, endpoint, payload request/response, kode error, dan autentikasi API. |
| [BACKEND-HANDOFF.md](./BACKEND-HANDOFF.md) | Panduan arsitektur backend, keputusan desain database, eager loading, dan checklist integrasi. |

Panduan alur kontribusi dan standar kode repository ada di [../CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Status Arsitektur Monorepo

Repository ini mengintegrasikan seluruh ekosistem aplikasi ke dalam satu repository (monorepo):
1. **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Terletak di root directory.
2. **Backend**: NestJS 11, Prisma ORM 5, PostgreSQL 16, TypeScript. Terletak di direktori [`../backend`](../backend).
3. **Database & Container**: Konfigurasi Docker Compose untuk PostgreSQL dan skrip inisialisasi tersedia di [`../backend/docker-compose.yml`](../backend/docker-compose.yml).
4. **API Integration Layer**: Terletak di [`../lib/data`](../lib/data), menyediakan kontrak antarmuka (`contracts.ts`), decoder type-safe (`decoders.ts`), dan repository API adapter (`api-auth.ts`, `api-school.ts`, `api-attendance.ts`, `api-monitoring.ts`, `api-admin.ts`, `api-activity.ts`).
5. **CI**: GitHub Actions (`.github/workflows/ci.yml`) menjalankan lint, typecheck, test, audit dependensi, build aplikasi, dan build image Docker. Workflow berjalan saat push ke `main`, `production-ready`, atau `feature/**`, saat pull request ke `main`, dan bisa dijalankan manual.

---

## Panduan Cepat Menjalankan Sistem

Gunakan Node.js `>=22.12.0`, npm `>=10`, dan Docker Compose. Dari root repository, siapkan environment dan instal dependensi:

```bash
cp .env.example .env.local
cp backend/.env.example backend/.env
npm ci
npm --prefix backend ci
```

1. **Jalankan Database PostgreSQL**:
   ```bash
   npm run docker:db
   ```
2. **Migrasi & Seed Database Backend**:
   ```bash
   npm run backend:prisma:generate
   npm --prefix backend run prisma:migrate
   npm run backend:prisma:seed
   ```
3. **Jalankan Backend Dev Server (Port 4000)**:
   ```bash
   npm run backend:dev
   ```
4. **Jalankan Frontend Dev Server (Port 3000)**:
   ```bash
   npm run dev
   ```
5. **Jalankan Test**:
   ```bash
   npm test                              # Test frontend (Vitest)
   npm run backend:test                  # Unit test backend (Jest)
   npm --prefix backend run test:e2e     # E2E backend; perlu database test terisolasi
   ```
