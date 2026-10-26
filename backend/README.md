# Backend API Sistem Presensi Siswa

API NestJS untuk autentikasi, akun, data siswa dan sekolah, presensi, jadwal, monitoring, laporan, surat izin/sakit, dan log aktivitas. Data disimpan di PostgreSQL melalui Prisma.

**Stack:** NestJS 11, TypeScript 5, Prisma 5, PostgreSQL 16.

## Modul API

Sebagian besar endpoint memakai prefix `/api/v1` dan autentikasi cookie sesi.

| Modul | Endpoint utama | Kegunaan |
|---|---|---|
| Auth | `/api/v1/auth` | Login, logout, dan profil sesi saat ini. |
| Users | `/api/v1/users` | Pengelolaan akun oleh Admin. |
| Students | `/api/v1/students` | Daftar dan detail siswa; perubahan data oleh Admin. |
| Teachers | `/api/v1/teachers` | Admin dan Guru Piket dapat membaca; Admin mengelola data. |
| Classes | `/api/v1/classes` | Membaca kelas sesuai cakupan pengguna; Admin mengelola kelas dan penugasan Ketua Kelas. |
| Attendance | `/api/v1/attendance` | Membaca, mencatat, mengoreksi, menghapus presensi, melihat riwayat dan rekap. Akses Ketua Kelas dibatasi ke kelas tugasnya. |
| Schedules | `/api/v1/schedules` | Membaca jadwal sesi; Admin mengubah jadwal dan status kunci sesi. |
| Monitoring | `/api/v1/monitoring` | Ringkasan presensi lintas kelas untuk Admin dan Guru Piket. |
| Stats | `/api/v1/stats` | Tren kehadiran, siswa dengan Alpa terbanyak, dan perbandingan kelas untuk Admin dan Guru Piket. |
| Reports | `/api/v1/reports` | Laporan kelas/siswa, ringkasan, dan ekspor CSV dengan cakupan sesuai peran. |
| Sick Letters | `/api/v1/sick-letters` | Unggah serta akses berkas surat izin/sakit dengan validasi file dan batas kelas. |
| Audit Logs | `/api/v1/audit-logs` | Log aktivitas untuk Admin dan Guru Piket. |
| Health | `/health`, `/health/db` | Status API dan koneksi database. Endpoint ini tidak memakai prefix `/api/v1`. |

Role dan cakupan data tetap diperiksa backend. Ketua Kelas dibatasi ke kelas yang ditugaskan, Guru Piket dapat mengelola presensi lintas kelas tanpa mengelola akun atau data induk, dan Admin mengelola data sekolah. Permintaan perubahan memeriksa `Origin`; DTO divalidasi secara global.

## Menjalankan secara lokal

### Prasyarat

- Node.js `>=22.12.0` dan npm `>=10`.
- Docker Compose, jika PostgreSQL dijalankan dari container.

Jalankan perintah berikut dari root repository:

```bash
npm ci
npm --prefix backend ci
cp backend/.env.example backend/.env
cp .env.example .env.local
npm run docker:db
npm run backend:prisma:generate
npm --prefix backend run prisma:migrate
```

Untuk membuat Admin pertama, isi `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` di `backend/.env`, lalu jalankan:

```bash
npm run backend:prisma:seed
```

Seed selalu menyiapkan jadwal awal sesi pagi dan siang. Akun Admin dibuat hanya jika kedua variabel `INITIAL_ADMIN_*` diisi dan akun tersebut belum ada. Seed tidak membuat data sekolah contoh atau mengganti password akun yang sudah ada. Password awal harus minimal 12 karakter dan maksimal 72 byte UTF-8.

Jalankan API dari root dengan `npm run backend:dev`, atau dari folder `backend/` dengan:

```bash
npm run start:dev
```

API tersedia di `http://localhost:4000/api/v1`. Health check ada di `/health` dan `/health/db`. Swagger ada di `/api/docs` hanya saat `NODE_ENV` bukan `production`.

## Environment utama

Lihat [`backend/.env.example`](./.env.example). Variabel yang paling sering disesuaikan:

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Koneksi ke PostgreSQL. Nilai contoh mengarah ke database lokal `presensi_dev`. |
| `PORT` | Port API, default `4000`. |
| `CORS_ORIGINS` | Daftar origin frontend yang diizinkan; pisahkan dengan koma. |
| `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_MS`, `SESSION_SAME_SITE` | Nama, masa berlaku, dan kebijakan SameSite cookie sesi. |
| `BCRYPT_ROUNDS` | Cost bcrypt, integer 10 sampai 15; default `12`. |
| `UPLOAD_DIR`, `UPLOAD_MAX_SIZE_BYTES` | Folder unggahan dan ukuran maksimum berkas, default 5 MiB. |
| `SCHOOL_WORKING_DAYS`, `SCHOOL_HOLIDAYS` | Hari kerja ISO dan tanggal libur untuk perhitungan hari sekolah. |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | Kredensial opsional untuk membuat Admin pertama melalui seed. |

Pada Docker Compose production, migrasi dan seed memakai akun bootstrap PostgreSQL. API menggunakan `POSTGRES_APP_USER` terpisah dengan hak database runtime yang lebih terbatas. Ikuti [Setup Production](../docs/PRODUCTION-SETUP.md) untuk konfigurasi server.

## Test dan build

Unit test backend:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Test end-to-end membutuhkan database test tersendiri bernama `presensi_test`. Fixture menolak database dengan nama lain dan membuat akun serta data khusus E2E. Gunakan kredensial test sementara, bukan kredensial sekolah. Contoh PowerShell dari folder `backend/`:

```powershell
$env:NODE_ENV = "test"
$env:DATABASE_URL = "postgresql://presensi:local-password@localhost:5432/presensi_test?schema=public"
$env:TEST_ADMIN_PASSWORD = "temporary-admin-password"
$env:TEST_GURU_PASSWORD = "temporary-guru-password"
$env:TEST_KETUA_PASSWORD = "temporary-ketua-password"
npm run prisma:seed:e2e
npm run test:e2e
```

Pastikan database `presensi_test` sudah dibuat dan kredensial pada `DATABASE_URL` hanya memiliki akses ke database test tersebut. Semua password fixture harus minimal 12 karakter.

## Struktur kode

- `src/modules/` berisi controller, service, DTO, dan test tiap domain.
- `src/common/` berisi guard autentikasi/role/CSRF, filter error, interceptor, dan utilitas akses.
- `src/config/` memuat konfigurasi dan validasi environment.
- `prisma/` berisi skema, migrasi, dan seed.
- `test/` berisi fixture serta test end-to-end.

Panduan deployment, backup, dan restore bersama frontend tersedia di [README root](../README.md) dan [`docs/PRODUCTION-SETUP.md`](../docs/PRODUCTION-SETUP.md).
