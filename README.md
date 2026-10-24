# Sistem Presensi Siswa — SMK Negeri 11 Jakarta

[![CI/CD](https://github.com/Fachri-analys/presensi-siswa/actions/workflows/ci.yml/badge.svg)](https://github.com/Fachri-analys/presensi-siswa/actions)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/UI-React%2019-blue?logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2010-red?logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2D3748?logo=prisma)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-blue?logo=typescript)](https://www.typescriptlang.org/)

Sistem Informasi Presensi Siswa terintegrasi berbasis monorepo untuk **SMK Negeri 11 Jakarta**. Dirancang untuk mendigitalkan proses pencatatan kehadiran harian, verifikasi surat izin/sakit dokter, monitoring kehadiran *real-time*, dan rekapitulasi laporan semester otomatis berstandar dinas pendidikan.

---

## 🌟 Fitur Utama

- **Otorisasi Berbasis Peran (RBAC):**
  - **Admin:** Kontrol penuh data master (Siswa, Guru, Rombel Kelas), penugasan akun, pengaturan jadwal sesi, dan log audit sistem.
  - **Guru Piket:** Akses presensi seluruh kelas, monitoring kehadiran harian secara *live*, dan pemberian dispensasi izin Hadir di luar jadwal.
  - **Ketua Kelas:** Akses terisolasi khusus rombel kelasnya sendiri untuk pencatatan presensi dan unggah surat sakit siswa sekelas.
- **Pencatatan Presensi Real-Time:** Mendukung status *Hadir*, *Terlambat*, *Izin*, *Sakit*, dan *Alpa* dengan penyimpanan batch atomik (`$transaction`) untuk mencegah inkonsistensi data.
- **Unggah & Validasi Surat Izin/Sakit:** Unggah bukti surat dokter/orang tua (PDF, JPG, PNG) dengan validasi ukuran (< 5 MB), pemeriksaan tipe MIME, sanitasi nama berkas UUID, dan proteksi IDOR.
- **Monitoring & Statistik Kehadiran:** Dashboard interaktif dengan ringkasan kehadiran harian per kelas, grafik tren kehadiran, dan pelacakan siswa yang membutuhkan tindak lanjut.
- **Ekspor Dokumen Berstandar Sekolah:**
  - **Excel (`.xlsx`):** Lembar kerja berformat rapi lengkap dengan kop sekolah SMKN 11 Jakarta, logo resmi, dan kalkulasi persentase otomatis menggunakan `exceljs`.
  - **Cetak Laporan (PDF):** Layout dokumen ramah cetak (`@media print`) yang siap dicetak langsung atau disimpan sebagai PDF dinas.
---

## 🏗️ Arsitektur Sistem

Aplikasi dibangun menggunakan pola arsitektur **Monorepo**:

```text
## 🚀 Panduan Memulai Cepat

### Prasyarat

- **Node.js:** Versi >= 20.9.0
- **npm:** Versi >= 10.0.0
- **Docker & Docker Compose:** Untuk menjalankan PostgreSQL lokal

### 1. Kloning Repositori & Instal Dependensi

```bash
git clone https://github.com/Fachri-analys/presensi-siswa.git
cd presensi-siswa

# Instal dependensi frontend & backend
npm install
npm --prefix backend install
```

### 2. Konfigurasi Lingkungan (.env)

Salin berkas template environment:

```bash
# Frontend
cp .env.example .env.local

# Backend
cp backend/.env.example backend/.env
```

### 3. Jalankan Database & Migrasi

```bash
# Jalankan container PostgreSQL
npm run docker:db

# Inisialisasi schema & seed database
npm run backend:prisma:generate
npm --prefix backend run prisma:migrate
npm run backend:prisma:seed
```

Seed tidak membuat data contoh. Untuk menyiapkan Admin pertama, isi `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` di `backend/.env` sebelum menjalankan seed. Password minimal 12 karakter.

### 4. Jalankan Aplikasi

Buka dua terminal terpisah:

```bash
# Terminal 1: Backend API (Port 4000)
npm run backend:dev

# Terminal 2: Frontend App (Port 3000)
npm run dev
```

- **Aplikasi Web:** [http://localhost:3000](http://localhost:3000)
- **API Swagger Docs:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## 🧪 Pengujian Otomatis & Kualitas Kode

Pemeriksaan otomatis yang tersedia mencakup test suite, pemeriksaan tipe TypeScript, dan lint:

```bash
# Jalankan unit test frontend (Vitest)
npm test

# Jalankan unit test backend (Jest)
npm run backend:test

# Pemeriksaan tipe TypeScript
npm run typecheck
npm --prefix backend run typecheck

# Linting kode
npm run lint
npm --prefix backend run lint
```

---

## 🐳 Deployment Produksi (Docker)

Aplikasi dilengkapi Dockerfile multi-stage production dengan keamanan non-root user (UID 1001):

```bash
# Build dan jalankan backend API
docker build -t presensi-backend:latest ./backend
docker run -d --name presensi-api --restart unless-stopped -p 4000:4000 --env-file backend/.env -v presensi_uploads:/app/uploads presensi-backend:latest

# Build dan jalankan frontend Web
docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.domain-sekolah.sch.id/api/v1/ -t presensi-frontend:latest .
docker run -d --name presensi-web --restart unless-stopped -p 3000:3000 presensi-frontend:latest
```

Ganti URL contoh dengan origin API HTTPS production. URL API frontend dibenamkan saat build, sedangkan variabel backend harus menunjuk ke database production yang bisa diakses dari container; jangan memakai kredensial contoh. Jalankan `prisma:migrate:deploy` sebelum mengganti image backend. Volume `presensi_uploads` menjaga lampiran surat tetap ada setelah container dibuat ulang. Jalankan satu replica backend selama file masih disimpan di volume lokal; skala horizontal memerlukan storage file dan rate limiter bersama.

### Backup & Restore Database

Gunakan backup terjadwal dari penyedia PostgreSQL atau `pg_dump` dengan kredensial dari secret manager. Uji pemulihan hanya ke database staging kosong sebelum merilis; jangan menjalankan restore di database operasional sebagai langkah uji.

```bash
pg_dump --host="$PGHOST" --username="$PGUSER" --dbname="$PGDATABASE" --format=custom --file="presensi_$(date +%Y%m%d_%H%M%S).dump"
pg_restore --host="$STAGING_PGHOST" --username="$STAGING_PGUSER" --dbname="$STAGING_PGDATABASE" --no-owner "presensi_YYYYMMDD_HHMMSS.dump"
```

---

## 📖 Dokumentasi Lengkap

Dokumentasi spesifikasi teknis dan perancangan sistem tersimpan di direktori [`docs/`](./docs):

- **[PRD (Product Requirements Document)](./docs/PRD.md):** Tujuan produk, persona, dan aturan bisnis.
- **[SRS (Software Requirements Specification)](./docs/SRS.md):** Kebutuhan fungsional & nonfungsional sistem.
- **[API Contract](./docs/API-CONTRACT.md):** Spesifikasi lengkap endpoint REST API dan skema payload.
- **[Backend Handoff](./docs/BACKEND-HANDOFF.md):** Arsitektur backend, kontrol keamanan, dan panduan serah terima.
- **[Peta proyek](./docs/PROJECT-MAP.md):** Struktur repo, route, modul, dan alur data.

---

## 📄 Lisensi

Hak Cipta © 2026 SMK Negeri 11 Jakarta. Dikembangkan untuk keperluan operasional internal sekolah.
