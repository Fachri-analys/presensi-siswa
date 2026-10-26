# Sistem Presensi Siswa — SMK Negeri 11 Jakarta

[![CI](https://github.com/Fachri-analys/presensi-siswa/actions/workflows/ci.yml/badge.svg)](https://github.com/Fachri-analys/presensi-siswa/actions)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/UI-React%2019-blue?logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-red?logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2D3748?logo=prisma)](https://www.prisma.io/)

Sistem presensi berbasis web untuk pencatatan kehadiran, pemantauan kelas, verifikasi surat izin atau sakit, dan laporan sekolah. Frontend Next.js dan backend NestJS berada dalam satu repository dan menggunakan PostgreSQL.

## Fitur

- Role pengguna: Admin, Guru Piket, dan Ketua Kelas.
- Presensi siswa: Hadir, Terlambat, Izin, Sakit, dan Alpa.
- Pengelolaan siswa, guru, kelas, akun, dan jadwal presensi.
- Monitoring kehadiran, riwayat, laporan, dan ekspor data.
- Unggah surat izin atau sakit dengan validasi tipe dan batas ukuran 5 MB.

## Struktur Repository

```text
.
├── app/                     # Route dan halaman Next.js
├── components/              # Komponen UI
├── lib/data/                # Client API dan adapter frontend
├── tests/                   # Test frontend
├── backend/
│   ├── prisma/              # Schema, migrasi, dan seed
│   ├── src/modules/         # Modul API NestJS
│   └── test/                # Test end-to-end backend
├── docs/                    # Peta proyek dan spesifikasi
├── .github/workflows/ci.yml # Pemeriksaan GitHub Actions
├── Dockerfile               # Image frontend
└── package.json
```

## Menjalankan Secara Lokal

### Prasyarat

- Node.js `>=22.12.0` dan npm `>=10`.
- Docker dengan Docker Compose untuk PostgreSQL lokal.

### Instalasi dan konfigurasi

```bash
git clone https://github.com/Fachri-analys/presensi-siswa.git
cd presensi-siswa
npm ci
npm --prefix backend ci
cp .env.example .env.local
cp backend/.env.example backend/.env
```

Nilai default pada `backend/.env.example` ditujukan untuk database lokal. Untuk menyiapkan Admin awal, isi `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` di `backend/.env` sebelum menjalankan seed. Password minimal 12 karakter dan maksimal 72 byte UTF-8 (batas bcrypt). Seed tidak membuat data contoh.

### Database dan aplikasi

```bash
npm run docker:db
npm run backend:prisma:generate
npm --prefix backend run prisma:migrate
npm run backend:prisma:seed
```

Tunggu hingga container PostgreSQL berstatus `healthy`, lalu jalankan backend dan frontend di terminal terpisah:

```bash
# Terminal 1
npm run backend:dev

# Terminal 2
npm run dev
```

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- Swagger: [http://localhost:4000/api/docs](http://localhost:4000/api/docs) saat backend berjalan di mode non-production.

## Pemeriksaan dan Test

Perintah yang sama digunakan untuk pemeriksaan lokal dan CI:

```bash
npm run lint
npm run typecheck
npm test
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix backend run test:e2e
```

Test end-to-end backend membutuhkan PostgreSQL test terpisah serta fixture test. Lihat [backend README](./backend/README.md) untuk konfigurasi dan perintahnya.

GitHub Actions menjalankan lint, typecheck, test, audit dependensi, dan build untuk frontend serta backend. Pipeline backend memakai PostgreSQL untuk migrasi dan test end-to-end; kedua image Docker juga dibangun sebagai pemeriksaan. Workflow berjalan pada push ke `main`, `production-ready`, dan `feature/**`, pada pull request ke `main`, serta dapat dijalankan manual melalui tab **Actions**.

## Docker Produksi

Deployment satu server memakai Docker Compose, PostgreSQL privat, API dan frontend pada loopback, serta Caddy untuk HTTPS otomatis. Siapkan DNS, firewall, dan rahasia di server, lalu ikuti [panduan setup production](./docs/PRODUCTION-SETUP.md):

```bash
cp .env.production.example .env.production
chmod 600 .env.production
# Isi nilai production di .env.production, lalu:
./scripts/deploy-production.sh
```

Backup database dan berkas unggahan dapat dijalankan dengan `./scripts/backup-production.sh`. Panduan setup menjelaskan bootstrap admin, verifikasi, jadwal backup, uji restore di staging, dan rollback aplikasi.

GitHub Actions memvalidasi kode, image, dan konfigurasi Compose. Deployment tetap dijalankan operator di server setelah domain dan rahasia production disiapkan.

## Dokumentasi

- [Peta proyek](./docs/PROJECT-MAP.md)
- [Dokumentasi produk dan sistem](./docs/README.md)
- [Kontrak API](./docs/API-CONTRACT.md)
- [Panduan backend](./backend/README.md)
- [Setup production](./docs/PRODUCTION-SETUP.md)

Hak Cipta © 2026 SMK Negeri 11 Jakarta. Dikembangkan untuk keperluan operasional internal sekolah.
