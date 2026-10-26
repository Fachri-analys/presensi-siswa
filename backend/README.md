# Sistem Presensi Siswa — Backend API

Backend API resmi untuk Sistem Presensi Siswa SMK Negeri 11 Jakarta.

**Stack:** NestJS 11 · PostgreSQL 16 · Prisma 5 · TypeScript 5 · Docker

---

## Arsitektur & Modul

Backend ini memakai modul domain terpisah dan pengamanan berlapis, termasuk RBAC, pemeriksaan akses objek, perlindungan CSRF berbasis Origin, serta transaksi untuk perubahan presensi dan unggah surat:

| Modul | Endpoint Utama | Deskripsi & Otorisasi |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | Login (cookie session), logout, get current session. |
| **Students** | `/api/v1/students` | CRUD data siswa, proteksi IDOR Ketua Kelas, pagination & search. |
| **Classes** | `/api/v1/classes` | CRUD kelas, penetapan ketua kelas, eager loading jumlah siswa. |
| **Teachers** | `/api/v1/teachers` | CRUD data guru piket dan guru pengajar, validasi NIP unik. |
| **Attendance** | `/api/v1/attendance` | Batch simpan/ganti atomik (`$transaction`), riwayat dan rekap maksimal 366 hari, agregasi DB, pengelolaan jadwal sesi presensi. |
| **Monitoring** | `/api/v1/monitoring` | Rekapitulasi kehadiran real-time seluruh kelas per tanggal via agregasi dual-query O(1). |
| **Sick Letters** | `/api/v1/sick-letters` | Unggah surat sakit dengan validasi isi file dan ukuran, nama UUID, transaksi pembaruan presensi, serta endpoint unduh yang dibatasi role/kelas. |
| **Users** | `/api/v1/users` | Pengelolaan akun pengguna, hashing bcrypt, perubahan password oleh Admin & invalidasi sesi. |
| **Audit Logs** | `/api/v1/audit-logs` | Jejak audit aktivitas sistem dengan eager loading relasi aktor. |
| **Health** | `/api/v1/health` | Healthcheck server dan status konektivitas database PostgreSQL. |

---

## Prasyarat

- Node.js >= 22.12.0
- npm >= 10.0.0
- Docker Desktop (opsional, untuk menjalankan PostgreSQL via container)

---

## Konfigurasi Environment

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Variabel utama yang dikonfigurasi:
- `PORT`: Port server backend (default: `4000`).
- `DATABASE_URL`: URL koneksi PostgreSQL (contoh: `postgresql://postgres:postgres@localhost:5432/presensi_db?schema=public`).
- Pada Compose production, akun `POSTGRES_USER` dipakai untuk migrasi dan seed; API menggunakan `POSTGRES_APP_USER` terpisah dengan hak runtime minimum.
- `CORS_ORIGINS`: Daftar origin frontend yang diizinkan (contoh lokal: `http://localhost:3000`); wajib diisi dengan origin HTTPS di production.
- `UPLOAD_DIR`: Direktori penyimpanan berkas surat izin/sakit (default: `./uploads`).
- `SCHOOL_WORKING_DAYS`: Hari efektif ISO, Senin=`1` sampai Minggu=`7` (default: `1,2,3,4,5`).
- `SCHOOL_HOLIDAYS`: Tanggal libur format `YYYY-MM-DD`, dipisahkan koma. Kosongkan bila tidak ada.

---

## Menjalankan Backend

### 1. Menjalankan Database PostgreSQL (Docker)
Dari direktori root proyek:
```bash
npm run docker:db
```
Atau dari direktori `backend/`:
```bash
docker compose up -d postgres
```

### 2. Generate Prisma Client & Migrasi
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. Menjalankan Server Development
```bash
npm run start:dev
```
Server akan berjalan di `http://localhost:4000`. Dokumentasi interaktif Swagger API tersedia di `http://localhost:4000/api/docs`.

---

## Pengujian & Build

```bash
# Menjalankan unit test otomatis (Jest)
npm test

# Menjalankan linter
npm run lint

# Memeriksa tipe TypeScript
npm run typecheck

# Build produksi
npm run build
```

---

## Docker & Deployment Produksi

Backend ini dilengkapi multi-stage `Dockerfile` dengan non-root user (`nestjs`, UID 1001) untuk keamanan produksi:

```bash
# Build image Docker backend
docker build -t presensi-backend:latest .

# Menjalankan container backend
docker run -d \
  --name presensi-api \
  -p 4000:4000 \
  --env-file .env \
  -v presensi_uploads:/app/uploads \
  presensi-backend:latest
```

---

## Backup & Restore Database dan Berkas

Gunakan backup terjadwal dari penyedia PostgreSQL atau `pg_dump` dengan kredensial dari secret manager. Pulihkan backup ke database staging kosong untuk menguji proses pemulihan; jangan gunakan database produksi sebagai target uji.

Untuk deployment Compose repository ini, jalankan `../scripts/backup-production.sh`; konfigurasi server dan prosedur pemulihan staging ada di [`../docs/PRODUCTION-SETUP.md`](../docs/PRODUCTION-SETUP.md).

```bash
pg_dump --host="$PGHOST" --username="$PGUSER" --dbname="$PGDATABASE" --format=custom --file="presensi_$(date +%Y%m%d_%H%M%S).dump"
pg_restore --host="$STAGING_PGHOST" --username="$STAGING_PGUSER" --dbname="$STAGING_PGDATABASE" --no-owner "presensi_YYYYMMDD_HHMMSS.dump"
```

Lampiran surat berada di volume Docker `presensi_uploads` pada contoh deployment root. Cadangkan juga volume tersebut; backup database saja tidak menyertakan isi berkas. Contoh berikut memakai direktori `backups` pada PowerShell:

```powershell
New-Item -ItemType Directory -Force backups
docker run --rm -v presensi_uploads:/data:ro -v "${PWD}/backups:/backup" alpine tar -czf /backup/presensi_uploads.tar.gz -C /data .
```

Untuk uji pemulihan, gunakan volume baru dan lingkungan staging kosong:

```powershell
docker volume create presensi_uploads_restore
docker run --rm -v presensi_uploads_restore:/data -v "${PWD}/backups:/backup" alpine tar -xzf /backup/presensi_uploads.tar.gz -C /data
```

Jalankan container staging dengan `-v presensi_uploads_restore:/app/uploads` dan database staging yang dipulihkan. Jangan mengekstrak backup ke volume production yang sedang dipakai. Simpan backup database dan berkas di lokasi terenkripsi dengan akses terbatas. Uji pemulihan berkala sebelum menganggap backup dapat dipakai.

Hari efektif default menghitung Senin–Jumat. Masukkan hari libur dan perubahan hari sekolah pada `SCHOOL_HOLIDAYS` dan `SCHOOL_WORKING_DAYS` sebelum periode laporan dimulai.

---

## Menyiapkan akun awal

Seed hanya membuat jadwal presensi dan, bila diminta, akun Admin pertama. Atur `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` secara lokal sebelum menjalankan seed. Keduanya wajib diisi bersama; password minimal 12 karakter. Seed tidak membuat akun, kelas, guru, atau siswa contoh, dan tidak mengubah password Admin yang sudah ada.

Test end-to-end memakai database terisolasi bernama `presensi_test`. Set `NODE_ENV=test`, arahkan `DATABASE_URL` ke database tersebut, isi `TEST_ADMIN_PASSWORD`, `TEST_GURU_PASSWORD`, dan `TEST_KETUA_PASSWORD` (minimal 12 karakter), lalu jalankan `npm run prisma:seed:e2e` sebelum `npm run test:e2e`. Fixture menolak database lain agar tidak menyentuh data operasional.
