# Sistem Presensi Siswa — Backend API

Backend API resmi untuk Sistem Presensi Siswa SMK Negeri 11 Jakarta.

**Stack:** NestJS 10 · PostgreSQL 16 · Prisma 5 · TypeScript 5 · Docker

---

## Arsitektur & Modul

Backend ini dibangun dengan prinsip modularitas, pengamanan berlapis (RBAC, IDOR guard, anti-CSRF), dan optimasi database tanpa masalah N+1 query:

| Modul | Endpoint Utama | Deskripsi & Otorisasi |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | Login (cookie session), logout, get current session. |
| **Students** | `/api/v1/students` | CRUD data siswa, proteksi IDOR Ketua Kelas, pagination & search. |
| **Classes** | `/api/v1/classes` | CRUD kelas, penetapan ketua kelas, eager loading jumlah siswa. |
| **Teachers** | `/api/v1/teachers` | CRUD data guru piket dan guru pengajar, validasi NIP unik. |
| **Attendance** | `/api/v1/attendance` | Batch save atomik (`$transaction`), riwayat tanggal, rekap kehadiran semester (`groupBy` agregasi DB), pengelolaan jadwal sesi presensi. |
| **Monitoring** | `/api/v1/monitoring` | Rekapitulasi kehadiran real-time seluruh kelas per tanggal via agregasi dual-query O(1). |
| **Sick Letters** | `/api/v1/sick-letters` | Unggah surat izin/sakit dengan validasi MIME, batas 5MB, sanitasi UUID, dan proteksi IDOR. |
| **Users** | `/api/v1/users` | Pengelolaan akun pengguna, hashing bcrypt, reset password mandiri & invalidasi sesi (Hanya Admin). |
| **Audit Logs** | `/api/v1/audit-logs` | Jejak audit aktivitas sistem dengan eager loading relasi aktor. |
| **Health** | `/api/v1/health` | Healthcheck server dan status konektivitas database PostgreSQL. |

---

## Prasyarat

- Node.js >= 20.9.0
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
- `SESSION_SECRET`: Kunci rahasia session cookie (minimal 32 karakter).
- `CSRF_SECRET`: Kunci rahasia token CSRF.
- `CORS_ORIGINS`: Daftar domain yang diizinkan (contoh: `http://localhost:3000`).
- `UPLOAD_DIR`: Direktori penyimpanan berkas surat izin/sakit (default: `./uploads`).

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
  presensi-backend:latest
```

---

## Backup & Restore Database

### Pencadangan (Backup)
```bash
docker exec -t presensi-postgres pg_dump -U presensi -d presensi_dev --format=custom --blobs | gzip > backup_$(date +%Y%m%d_%H%M%S).dump.gz
```

### Pemulihan (Restore)
```bash
gunzip -c backup_YYYYMMDD_HHMMSS.dump.gz > restore.dump
docker exec -i presensi-postgres pg_restore -U presensi -d presensi_dev --clean --if-exists restore.dump
```

---

## Akun Pengujian & Seeding

Kredensial akun pengujian dikonfigurasi melalui environment variable lokal tanpa membocorkan password ke source code (`.env.test.local` / `.env`):
- `TEST_ADMIN_PASSWORD` (Admin: `admin.test@smkn11jakarta.sch.id`)
- `TEST_GURU_PASSWORD` (Guru Piket: `guru.test@smkn11jakarta.sch.id`)
- `TEST_KETUA_PASSWORD` (Ketua Kelas: `ketua.test@smkn11jakarta.sch.id`)

Jika environment variable tidak diset saat `npm run prisma:seed`, seed akan menghasilkan token acak aman via `crypto.randomBytes`.