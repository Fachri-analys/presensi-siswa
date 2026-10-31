# Backend API Sistem Presensi Siswa

API NestJS untuk autentikasi, akun, data siswa dan sekolah, presensi, jadwal, monitoring, laporan, surat izin/sakit, dan log aktivitas. Data disimpan di file SQLite melalui Prisma.

**Stack:** NestJS 11, TypeScript 5, Prisma 6, SQLite.

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
- Tidak perlu server database untuk development lokal.

Jalankan perintah berikut dari root repository:

```bash
npm ci
npm --prefix backend ci
cp backend/.env.example backend/.env
cp .env.example .env.local
npm run backend:prisma:generate
npm --prefix backend run prisma:migrate
```

Migrasi membuat `backend/prisma/dev.db`. File lokal tersebut diabaikan Git.

Untuk membuat Admin pertama, isi `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` di `backend/.env`, lalu jalankan:

```bash
npm run backend:prisma:seed
```

Seed selalu menyiapkan jadwal awal sesi pagi dan siang. Akun Admin dibuat hanya jika kedua variabel `INITIAL_ADMIN_*` diisi dan akun tersebut belum ada. Seed tidak membuat data sekolah contoh atau mengganti password akun yang sudah ada. Password awal harus minimal 12 karakter dan maksimal 72 byte UTF-8.

Untuk mencoba ketiga role di database development, isi `LOCAL_TEST_*_EMAIL` dan `LOCAL_TEST_*_PASSWORD` pada `backend/.env`, lalu jalankan dari folder `backend/`:

```bash
npm run local:seed-test-users
```

Password akun tes harus minimal 24 karakter, memakai sedikitnya 3 jenis karakter, dan maksimal 72 byte UTF-8. Seeder hanya berjalan dengan `NODE_ENV=development` dan `DATABASE_URL=file:./dev.db`; ia membuat satu kelas lokal untuk Ketua Kelas, tidak mereset akun yang sudah ada, dan tidak mencetak password.

Jalankan API dari root dengan `npm run backend:dev`, atau dari folder `backend/` dengan:

```bash
npm run start:dev
```

API tersedia di `http://localhost:4000/api/v1`. Health check ada di `/health` dan `/health/db`. Swagger ada di `/api/docs` hanya saat `NODE_ENV` bukan `production`.

## Environment utama

Lihat [`backend/.env.example`](./.env.example). Variabel yang paling sering disesuaikan:

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | Lokasi file SQLite; contoh lokal `file:./dev.db`, relatif terhadap `prisma/schema.prisma`. |
| `PORT` | Port API, default `4000`. |
| `CORS_ORIGINS` | Daftar origin frontend yang diizinkan; pisahkan dengan koma. |
| `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_MS`, `SESSION_SAME_SITE` | Nama, masa berlaku, dan kebijakan SameSite cookie sesi. |
| `BCRYPT_ROUNDS` | Cost bcrypt, integer 10 sampai 15; default `12`. |
| `UPLOAD_DIR`, `UPLOAD_MAX_SIZE_BYTES` | Folder unggahan dan ukuran maksimum berkas, default 5 MiB. |
| `SCHOOL_WORKING_DAYS`, `SCHOOL_HOLIDAYS` | Hari kerja ISO dan tanggal libur untuk perhitungan hari sekolah. |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | Kredensial opsional untuk membuat Admin pertama melalui seed. |

Pada Docker Compose production, migrasi dan API memakai file `/app/data/presensi.db` pada named volume SQLite persisten. Volume database terpisah dari image dan volume unggahan. Ikuti [Setup Production](../docs/PRODUCTION-SETUP.md) untuk konfigurasi server, backup, dan restore.

## Test dan build

Unit test backend:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Test end-to-end menggunakan file terpisah `backend/prisma/presensi_test.db`. Fixture menolak file dengan nama lain dan membuat akun serta data khusus E2E. Contoh PowerShell dari folder `backend/`:

```powershell
$env:NODE_ENV = "test"
$env:DATABASE_URL = "file:./presensi_test.db"
$env:TEST_ADMIN_PASSWORD = "temporary-admin-password"
$env:TEST_GURU_PASSWORD = "temporary-guru-password"
$env:TEST_KETUA_PASSWORD = "temporary-ketua-password"
npm run prisma:seed:e2e
npm run test:e2e
```

Jalankan `npx prisma migrate deploy` terlebih dulu dengan `NODE_ENV=test` dan `DATABASE_URL` tersebut. File E2E berbeda dari database development. Semua password fixture harus minimal 12 karakter.

## Struktur kode

- `src/modules/` berisi controller, service, DTO, dan test tiap domain.
- `src/common/` berisi guard autentikasi/role/CSRF, filter error, interceptor, dan utilitas akses.
- `src/config/` memuat konfigurasi dan validasi environment.
- `prisma/` berisi skema, migrasi, dan seed.
- `test/` berisi fixture serta test end-to-end.

Panduan deployment, backup, dan restore bersama frontend tersedia di [README root](../README.md) dan [`docs/PRODUCTION-SETUP.md`](../docs/PRODUCTION-SETUP.md).
