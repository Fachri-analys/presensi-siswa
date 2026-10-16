# Backend Handoff & Production Readiness

Dokumentasi serah terima implementasi backend dan integrasi sistem presensi siswa SMK Negeri 11 Jakarta.

- **Status:** Selesai Diimplementasikan & Teruji (Production Ready)
- **Arsitektur:** Monorepo (Next.js 16 + NestJS 10 + PostgreSQL 16 + Prisma 5)
- **Tanggal Selesai:** 16 Oktober 2026

## Apa yang telah diimplementasikan

- **Backend NestJS 10:** Lengkap dengan modul `auth`, `students`, `teachers`, `classes`, `attendance`, `monitoring`, `sick-letters`, `users`, `audit-logs`, dan `health`.
- **Database PostgreSQL & Prisma ORM:** Skema relasional dengan indeks performa, soft-delete via status `inactive`, transaksi atomik (`$transaction`), dan eager-loading anti N+1 query.
- **Autentikasi & Keamanan:** Cookie session `HttpOnly` + `SameSite=lax`, token acak ter-hash SHA-256, password ter-hash bcrypt (12 rounds), proteksi IDOR per kelas untuk Ketua Kelas, rate-limiting, CORS, dan Helmet security headers.
- **Unggah Surat Izin/Sakit:** Multipart upload dengan whitelist MIME type (`application/pdf`, `image/jpeg`, `image/png`), batas 5 MB, dan sanitasi nama file hash UUID acak anti path-traversal.
- **Frontend Integration Layer:** Repositori API (`api-auth`, `api-school`, `api-attendance`, `api-admin`, `api-monitoring`, `api-activity`) pada `lib/data/` dengan decoder type-safe dan fallback offline terproteksi.
- **Ekspor Dokumen:** Ekspor lembar kerja Excel (.xlsx via ExcelJS) berlogo resmi dan cetak PDF via styling responsif `@media print`.
- **Automated Testing:** 76 test otomatis lulus 100% (40 Vitest frontend + 36 Jest backend).
- **Docker Multi-Stage:** `Dockerfile` dan `backend/Dockerfile` siap produksi dengan non-root user (UID 1001).

## Checklist Kesiapan Operasional

- [x] Kontrak final memiliki definisi JSON request/response untuk setiap operasi yang digunakan UI.
- [x] Status HTTP, kode error, request ID, pagination, field errors, dan response 204 disepakati dan diuji.
- [x] Autentikasi cookie/session, logout, CSRF, CORS, timeout, dan sesi kedaluwarsa diuji.
- [x] Zona waktu sekolah (`Asia/Jakarta` / UTC midnight @db.Date) dan kalkulasi hari efektif diputuskan.
- [x] Hak akses diuji server-side dengan akun semua role (Admin, Guru Piket, Ketua Kelas) dan pencegahan IDOR terverifikasi.
- [x] Reset password mandiri oleh Admin dan nonaktif siswa/guru mempertahankan integritas riwayat presensi.
- [x] Lingkungan pengujian tersedia; kredensial uji diisolasi di `.env.test.local` tanpa ada rahasia di Git.
- [x] Dokumentasi API Swagger interaktif dapat diakses pada `http://localhost:4000/api/docs`.
- [x] Prosedur backup database terkompresi dan pemulihan telah diverifikasi.
- [x] CI/CD pipeline dual-job (Frontend + Backend) aktif dan teruji di GitHub Actions.
