# Sistem Presensi Siswa

Web app untuk mencatat presensi siswa dan membantu sekolah melihat rekap kehadiran. Repository ini berisi frontend Next.js, API NestJS, serta skema dan migrasi PostgreSQL melalui Prisma.

[![CI](https://github.com/Fachri-analys/presensi-siswa/actions/workflows/ci.yml/badge.svg)](https://github.com/Fachri-analys/presensi-siswa/actions)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/UI-React%2019-blue?logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-red?logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2D3748?logo=prisma)](https://www.prisma.io/)

## Fitur dan akses pengguna

| Peran | Akses utama |
|---|---|
| Admin | Mengelola akun, siswa, guru, kelas, penugasan Ketua Kelas, dan jadwal. Dapat melihat serta mengelola presensi seluruh kelas. |
| Guru Piket | Melihat data sekolah yang diperlukan untuk piket, mencatat presensi lintas kelas, memberi izin pencatatan Hadir/Terlambat di luar sesi, serta melihat monitoring, laporan, dan log aktivitas. Tidak mengelola akun atau data induk. |
| Ketua Kelas | Melihat data dan mencatat presensi hanya untuk kelas yang ditugaskan. Dapat melihat riwayat, laporan, dan surat izin/sakit dalam cakupan kelasnya. |

Sistem mencatat status Hadir, Terlambat, Izin, Sakit, dan Alpa. Jadwal awal menyediakan sesi pagi dan siang, yang dapat disesuaikan Admin. Fitur lain mencakup monitoring kelas, rekap dan ekspor CSV, pengelolaan akun, serta unggah dan akses berkas surat izin atau sakit.

## Struktur repository

```text
.
├── app/                     # Halaman Next.js App Router
├── components/              # Dashboard, presensi, tabel, dan komponen UI
├── lib/data/                # API client, kontrak, decoder, dan adapter frontend
├── tests/                   # Unit test frontend
├── backend/
│   ├── prisma/              # Skema, migrasi, dan seed PostgreSQL
│   ├── src/modules/         # Modul API NestJS
│   └── test/                # Fixture dan test end-to-end
├── docs/                    # Peta proyek, setup, kontrak API, dan audit
├── scripts/                 # Deploy, backup, dan inisialisasi role database
├── .github/workflows/ci.yml # CI frontend dan backend
├── Dockerfile               # Image frontend
└── docker-compose.production.yml
```

Alur aplikasi: browser memanggil API melalui `lib/data/`; API memeriksa sesi dan peran pengguna, lalu membaca atau mengubah data PostgreSQL melalui Prisma. Akun dan peran berasal dari backend. Detail modul dan alur ada di [peta proyek](./docs/PROJECT-MAP.md).

## Menjalankan secara lokal

### Prasyarat

- Node.js `>=22.12.0` dan npm `>=10`.
- Docker dengan Docker Compose untuk PostgreSQL lokal.

### Instalasi

```bash
git clone https://github.com/Fachri-analys/presensi-siswa.git
cd presensi-siswa
npm ci
npm --prefix backend ci
cp .env.example .env.local
cp backend/.env.example backend/.env
```

`backend/.env.example` memakai konfigurasi database lokal. Jika seed juga perlu membuat Admin pertama, isi `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` di `backend/.env`. Password awal minimal 12 karakter dan maksimal 72 byte UTF-8. Seed menyiapkan jadwal pagi dan siang, tetapi tidak membuat akun, guru, kelas, atau siswa contoh.

### Database dan server

Jalankan dari root repository:

```bash
npm run docker:db
npm run backend:prisma:generate
npm --prefix backend run prisma:migrate
npm run backend:prisma:seed
```

Setelah PostgreSQL siap, buka dua terminal dari root repository:

```bash
npm run backend:dev
```

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- Health API: [http://localhost:4000/health](http://localhost:4000/health) dan `/health/db`
- Swagger: [http://localhost:4000/api/docs](http://localhost:4000/api/docs), hanya saat backend bukan production.

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm test
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend test
```

Test end-to-end backend menggunakan PostgreSQL test bernama `presensi_test` dan fixture khusus test. Jangan arahkan fixture tersebut ke database lokal berisi data operasional. Langkah setup ada di [backend README](./backend/README.md).

GitHub Actions menjalankan install bersih, audit dependency, lint, typecheck, unit test, migrasi PostgreSQL, test end-to-end, build aplikasi, validasi Compose, dan build image. Workflow berjalan pada push ke `main`, `production-ready`, dan `feature/**`, pull request ke `main`, serta dapat dijalankan manual. CI tidak melakukan deploy ke server.

## Deployment

Template production memakai Docker Compose pada satu server: PostgreSQL privat, API dengan akun database runtime terbatas, frontend, dan Caddy untuk HTTPS. Siapkan domain, DNS, firewall, serta secret server sebelum deploy. Petunjuk konfigurasi dan perintahnya ada di [Setup Production](./docs/PRODUCTION-SETUP.md).

```bash
cp .env.production.example .env.production
chmod 600 .env.production
# Isi variabel production, lalu:
./scripts/deploy-production.sh
```

Backup database dan berkas unggahan dapat dijalankan melalui `./scripts/backup-production.sh`. Atur lokasi backup offsite dan uji pemulihan sebelum dipakai sebagai prosedur operasional. Status temuan keamanan dan pekerjaan setup yang tersisa tercatat di [Security Audit](./docs/SECURITY-AUDIT.md).

## Dokumentasi

- [Peta proyek](./docs/PROJECT-MAP.md)
- [Dokumentasi produk dan sistem](./docs/README.md)
- [Kontrak API](./docs/API-CONTRACT.md)
- [Backend API](./backend/README.md)
- [Setup production](./docs/PRODUCTION-SETUP.md)
- [Audit keamanan](./docs/SECURITY-AUDIT.md)
