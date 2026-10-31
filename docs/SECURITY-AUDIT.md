# Audit Keamanan Aplikasi

**Tanggal:** 26 Oktober 2026  
**Cakupan:** repository Next.js/NestJS/Prisma, API, autentikasi/otorisasi, schema/migrasi, dependency lockfile, CI, Docker Compose, dan skrip deploy/backup.  
**Kesimpulan:** **NOT READY FOR PRODUCTION**. Perbaikan kode dan seluruh job CI pada commit `9834ffa` lulus; kesiapan server production, kebijakan retensi, serta uji backup/restore masih belum dibuktikan.

> **Pembaruan 31 Oktober 2026:** Dokumen ini merekam kondisi audit pada 26 Oktober, sebelum migrasi SQLite. Aplikasi, Prisma, CI, dan Compose kini menggunakan SQLite; temuan khusus PostgreSQL di bawah adalah temuan historis yang sudah tersupersesi. Migration PostgreSQL lama disimpan di `backend/prisma/migrations-postgresql/` sebagai arsip dan tidak dijalankan Prisma. Validasi SQLite, migrasi, 52 tes root, 88 tes unit backend, 8 tes E2E, lint, typecheck, dan build lokal telah lulus. Docker tidak tersedia dan database PostgreSQL lama tidak ditemukan, jadi runtime container serta impor data lama belum terverifikasi; status tetap **NOT READY FOR PRODUCTION**.

Audit awal menelusuri source dan alur browser → API client → endpoint NestJS → guard/service → Prisma, serta konfigurasi CI dan Compose pada saat itu. Run GitHub Actions [40347013642](https://github.com/Fachri-analys/presensi-siswa/actions/runs/40347013642) pada commit `9834ffa` adalah bukti untuk snapshot lama, bukan konfigurasi SQLite saat ini. Tidak ada akses ke server/domain production, database berisi data operasional, atau secret manager, sehingga aspek tersebut tidak dinyatakan telah diuji.

## 40 pemeriksaan

| # | Pemeriksaan | Hasil | Bukti kode / dampak | Keparahan |
|---:|---|---|---|---|
| 1 | SQL injection pada query Prisma | LULUS | Query service menggunakan Prisma query builder dan parameter terstruktur; tidak ditemukan raw query yang menggabungkan input. | — |
| 2 | SQL injection pada raw query | LULUS | `$queryRaw` yang ditemukan hanya `SELECT 1` untuk health check; query bertag dan konstan. | — |
| 3 | Command injection | LULUS | Input request tidak diteruskan ke shell. Skrip backup/deploy mengutip path dan argumen shell. | — |
| 4 | Stored XSS | LULUS | Komponen merender data melalui React; tidak ditemukan `dangerouslySetInnerHTML` atau `innerHTML`. | — |
| 5 | Reflected XSS | LULUS | Tidak ditemukan interpolasi query/parameter request ke HTML mentah. | — |
| 6 | CSRF untuk operasi cookie-auth | LULUS | `CsrfGuard` memeriksa `Origin` tepat terhadap allowlist untuk semua method mutasi; logout juga melewati guard ini. | — |
| 7 | CORS dan credentials | LULUS | Origin berasal dari `CORS_ORIGINS`; credentials aktif tanpa wildcard. Validasi production mewajibkan HTTPS origin. | — |
| 8 | Atribut cookie sesi | LULUS | Cookie sesi `httpOnly`, `secure` di production, `SameSite` terkonfigurasi, path terbatas `/`, dan memiliki expiry. | — |
| 9 | Entropi dan penyimpanan token | LULUS | Token sesi dibuat dari 64 byte acak; database hanya menyimpan SHA-256 token. | — |
| 10 | Kedaluwarsa dan pencabutan sesi | LULUS | Sesi kedaluwarsa/nonaktif ditolak; perubahan password/status meniadakan sesi pengguna. | — |
| 11 | Penyimpanan password | LULUS | Password di-hash dengan bcrypt; konfigurasi membatasi cost 10–15, default 12. | — |
| 12 | Batas password bcrypt 72 byte | DIPERBAIKI | Bcrypt memangkas input setelah 72 byte. DTO login/buat/ubah akun dan seed kini menolak input di atas batas UTF-8; test red-green ditambahkan. | P2 sebelum fix |
| 13 | Enumerasi akun saat login | LULUS | Respons gagal generik; hash dummy dipakai saat email tidak ditemukan untuk mengurangi perbedaan waktu. | — |
| 14 | Rate limit login di belakang Caddy | DIPERBAIKI | Sebelumnya Express memakai alamat koneksi Caddy sehingga pengguna berbagi bucket dan dapat saling memblokir login. Production kini memercayai satu hop Caddy; unit test memastikan hanya production yang mengaktifkannya. | P2 sebelum fix |
| 15 | Penyimpanan rate limit saat scale-out | CATATAN | Throttler memakai penyimpanan proses. Cukup untuk Compose satu replika yang disiapkan; jika API diskalakan ke beberapa replika, bucket harus dipindahkan ke store bersama. | P2 bila scale-out |
| 16 | Guard autentikasi dan role | LULUS | `AuthGuard`/`RolesGuard` terdaftar global; semua route controller bisnis yang diperiksa memiliki deklarasi role. | — |
| 17 | Akses Admin/superuser aplikasi | LULUS | Admin melewati `RolesGuard` sebagai role tertinggi; hanya akun Admin yang dibuat melalui bootstrap/Admin terotorisasi. | — |
| 18 | IDOR data siswa | LULUS | Ketua Kelas dibatasi ke `kelasId` sesi untuk daftar dan detail siswa; test E2E lintas kelas menolak akses. | — |
| 19 | IDOR presensi | LULUS | Service memeriksa kelas pada baca, ubah, dan hapus; batch Ketua Kelas membatasi kelas dan tanggal. | — |
| 20 | IDOR laporan | LULUS | Laporan kelas dan siswa memverifikasi kelas Ketua Kelas; rentang dibatasi. | — |
| 21 | IDOR surat sakit | LULUS | Daftar, unggah, dan unduh mengecek cakupan kelas Ketua Kelas; file tidak diakses hanya dengan path. | — |
| 22 | Hak Guru Piket/Ketua/Admin | LULUS | E2E CI lulus: Admin/Guru/Ketua pada endpoint akun, Guru read-vs-write siswa, Ketua hanya melihat kelasnya, dan Ketua tanpa kelas ditolak. | — |
| 23 | Mass assignment | LULUS | `ValidationPipe` global memakai `whitelist`, `forbidNonWhitelisted`, dan transform; field tak dikenal ditolak. | — |
| 24 | Validasi enum, format, tanggal, dan nilai | LULUS | DTO memvalidasi role/status, format waktu, tanggal, UUID idempotensi, dan batas angka; service mengecek rentang tanggal secara semantik. | — |
| 25 | Pagination dan batas rentang | LULUS | Page/limit dibatasi; laporan, statistik, riwayat presensi maksimal 366 hari. | — |
| 26 | Batas ukuran payload multipart | DIPERBAIKI | Sebelumnya interceptor membatasi ukuran file saja, sementara jumlah field/part dan ukuran field tidak dibatasi eksplisit. Kini maksimal 1 file, 4 field, 5 part, field 2 KiB; test konfigurasi ditambahkan. | P2 sebelum fix |
| 27 | Tipe dan isi file upload | LULUS | Allowlist MIME JPG/PNG/PDF, cek magic bytes, batas file 5 MiB, nama file UUID. | — |
| 28 | Path traversal dan akses file lokal | LULUS | Nama upload tidak memakai nama pengguna; path unduh harus berada di direktori upload yang diharapkan. | — |
| 29 | Header unduh surat | LULUS | File dikirim sebagai attachment dengan `nosniff` dan `Cache-Control: private, no-store`. | — |
| 30 | Idempotensi upload | LULUS | UUID key dikaitkan dengan hash payload; retry sama mengembalikan hasil sama, key dengan payload lain ditolak. | — |
| 31 | SSRF | TIDAK BERLAKU | Backend tidak mengambil URL yang dikendalikan pengguna dan tidak menyediakan proxy/import URL. | — |
| 32 | Header keamanan API | LULUS | Helmet aktif pada backend; CSP API bawaan tetap aktif di production. | — |
| 33 | Content Security Policy frontend | PERLU PENGUATAN | `next.config.ts` memasang beberapa header tetapi belum CSP. React escaping mengurangi risiko XSS, namun CSP belum memberi lapisan mitigasi tambahan. | P2 pertahanan berlapis |
| 34 | Kebocoran detail error | LULUS | Exception filter merespons pesan umum untuk error server; stack hanya masuk log server. | — |
| 35 | Kebocoran secret di log | LULUS | Logging HTTP mencatat method/path/status/durasi; tidak mencatat body, password, atau cookie. | — |
| 36 | Audit aksi sensitif | LULUS DENGAN BATASAN | Perubahan penting dan ekspor dicatat. Kegagalan penyimpanan audit dilog tetapi tidak membatalkan aksi utama; log berada pada DB aplikasi, bukan penyimpanan immutable terpisah. | P2 bila butuh bukti tamper-proof |
| 37 | Retensi dan penghapusan PII | PERLU KEPUTUSAN | Data siswa, presensi, metadata audit, dan lampiran tidak punya TTL/penghapusan otomatis. Sekolah harus menetapkan masa simpan dan mekanisme penghapusan termasuk backup. | P2 operasional |
| 38 | Secret dan file environment | LULUS SEBAGIAN | File environment nyata di-ignore; file yang dilacak adalah template. Pemindaian pola pada working tree tidak menemukan private key/token umum; seluruh sejarah Git tidak dipindai dengan secret scanner khusus. | P2 sampai history scan |
| 39 | Dependency dan supply chain | LULUS DENGAN CATATAN | Pada run CI [40347013642](https://github.com/Fachri-analys/presensi-siswa/actions/runs/40347013642), `npm ci` dan `npm audit --audit-level=high` lulus untuk frontend/backend. Base image masih memakai tag yang dapat berubah, bukan digest. | P2 supply chain |
| 40 | Database dan container production | TEMUAN LAMA TERGANTIKAN + CATATAN | Snapshot audit lama memakai PostgreSQL. Aplikasi sekarang memakai file SQLite pada named volume persisten; migrasi dan seed memakai file yang sama dengan API. SQLite tidak menyediakan role database terpisah. Container app berjalan non-root, tetapi belum read-only/cap-drop/resource-limited dan image belum dipin digest. Compose belum diuji saat runtime di lingkungan lokal. | P2 hardening lanjut |

## Temuan terkonfirmasi dan perbaikan

1. **Temuan historis (tersupersesi) — API memakai akun PostgreSQL superuser.** Ini berlaku pada konfigurasi yang diaudit 26 Oktober, sebelum migrasi database. Saat itu Compose membangun `DATABASE_URL` API dari `POSTGRES_USER`; dokumentasi image resmi PostgreSQL menyatakan akun tersebut dibuat dengan hak superuser. [Sumber resmi image PostgreSQL](https://hub.docker.com/_/postgres). Konfigurasi PostgreSQL dan service `db-init` telah dihapus dari runtime; aplikasi kini memakai SQLite. Temuan ini bukan kerentanan pada konfigurasi aktif.
2. **Sedang — semua pengguna berbagi bucket rate limit Caddy.** Express tidak mempercayai proxy, jadi `req.ip` merujuk koneksi proxy dan limiter dapat membuat login saling terblokir. Perbaikan: percaya satu hop di production karena Caddy adalah reverse proxy tunggal pada Compose. Caddy mengabaikan header forwarded dari klien secara default sebelum menetapkan header proxy. [Dokumentasi reverse_proxy Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
3. **Sedang — password lebih dari 72 byte dipangkas bcrypt.** Sufiks password tidak menambah entropi hash dan bisa diabaikan saat verifikasi. Perbaikan: batas UTF-8 72 byte untuk login, pembuatan/perubahan akun, dan seed; test meliputi ASCII dan Unicode.
4. **Sedang — parser upload hanya membatasi ukuran file.** Multipart field/part tak punya batas eksplisit sehingga dapat menghabiskan memori sebelum validasi DTO. Perbaikan: batasi file, field, ukuran field, dan total part; test memastikan konfigurasi tersebut tetap aktif.

## Verifikasi yang dijalankan

- **Frontend setelah migrasi SQLite:** lint selesai tanpa error (1 warning `window.location.href`); typecheck dan production build lulus. Suite root lulus dengan 52 test.
- **Backend setelah migrasi SQLite:** typecheck dan build lulus; 88 unit test lulus; lint tanpa error (17 warning `any` yang sudah ada pada test/service/interceptor).
- **E2E dan migrasi pada audit awal:** Pada [run CI 40347013642](https://github.com/Fachri-analys/presensi-siswa/actions/runs/40347013642), migrasi PostgreSQL, pembuatan role runtime terbatas, verifikasi permission, E2E, dan image build backend lulus untuk konfigurasi saat itu. Setelah migrasi SQLite, validasi/generate Prisma dan migrasi lokal lulus; 8 tes E2E SQLite, build frontend/backend, lint, dan typecheck juga lulus. Docker tidak tersedia, jadi image serta Compose SQLite belum diuji saat runtime.
- **Audit dependency:** `npm audit` yang disebut di atas hanya berlaku pada snapshot CI lama. Audit dependency untuk lockfile Prisma yang baru belum dijalankan karena registry npm tidak dapat dihubungi dari desktop. Prisma dan Prisma Client diperbarui ke versi 6; tidak ada dependency langsung baru.
- **Diff dan secret scan working tree:** `git diff --check` lulus; pemindaian pola credential/private key yang umum tidak menemukan secret di working tree.

## Yang masih menghalangi status READY

- Operator perlu mengisi domain, DNS, firewall, secret production, bootstrap Admin, dan menjalankan deploy pertama.
- Sekolah perlu menetapkan retensi/penghapusan surat sakit, data siswa, presensi, dan audit.
- Jadwal backup offsite terenkripsi dan uji restore staging belum dilakukan pada server.
- Pemantauan uptime/disk/backup, pemindaian secret pada seluruh sejarah Git, dan keputusan apakah CSP serta container hardening lanjutan diwajibkan masih perlu dituntaskan.

Audit ini dan pembaruan migrasi belum membuktikan pemulihan database production atau impor data PostgreSQL lama. Database lama tidak tersedia di lingkungan dev, dan deployment container belum dapat dijalankan lokal. Karena itu, aplikasi belum dinyatakan siap produksi sampai prosedur impor (jika ada data lama), backup/restore, dan runtime deployment diverifikasi.
