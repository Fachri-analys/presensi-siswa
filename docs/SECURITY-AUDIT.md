# Audit Keamanan Aplikasi

**Tanggal:** 26 Oktober 2026  
**Cakupan:** repository Next.js/NestJS/Prisma, API, autentikasi/otorisasi, schema/migrasi, dependency lockfile, CI, Docker Compose, dan skrip deploy/backup.  
**Kesimpulan saat audit:** **NOT READY FOR PRODUCTION** sampai validasi CI terbaru, setup server, kebijakan retensi, serta uji backup/restore production selesai.

Audit menelusuri source dan alur browser → API client → endpoint NestJS → guard/service → Prisma/PostgreSQL, serta konfigurasi CI dan Compose. Pemeriksaan dependency lokal tidak dapat menghubungi npm registry dari desktop; workflow CI sebelumnya berhasil menjalankan `npm audit --audit-level=high`. Tidak ada akses ke server/domain production, database berisi data operasional, atau secret manager, sehingga aspek tersebut tidak dinyatakan telah diuji.

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
| 22 | Hak Guru Piket/Ketua/Admin | DITAMBAH TES | Decorator route menegakkan akses; E2E diperluas: Admin/Guru/Ketua pada endpoint akun dan Guru read-vs-write siswa. Hasil E2E menunggu CI karena perlu PostgreSQL. | — |
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
| 39 | Dependency dan supply chain | MENUNGGU CI TERBARU | Lockfile dipakai dengan `npm ci`; CI menjalankan audit high. Audit lokal gagal menghubungi registry, dan base image memakai tag yang dapat berubah. Jangan anggap scan dependency terbaru selesai sebelum run CI audit ini hijau. | P2 verifikasi |
| 40 | Database dan container production | DIPERBAIKI + CATATAN | API sebelumnya memakai `POSTGRES_USER`, yang pada image resmi PostgreSQL memiliki hak superuser. Kini API memakai role runtime terpisah tanpa superuser/CREATE schema; migrasi dan seed tetap memakai akun bootstrap. E2E CI memeriksa privilege sebenarnya. Container app berjalan non-root, tetapi belum read-only/cap-drop/resource-limited dan image belum dipin digest. | P1 sebelum fix; P2 hardening lanjut |

## Temuan terkonfirmasi dan perbaikan

1. **Tinggi — API memakai akun PostgreSQL superuser.** Compose membangun `DATABASE_URL` API dari `POSTGRES_USER`; dokumentasi image resmi PostgreSQL menyatakan akun tersebut dibuat dengan superuser power. [Sumber resmi image PostgreSQL](https://hub.docker.com/_/postgres). Perbaikan: service `db-init` membuat akun runtime terpisah dengan hanya koneksi, usage schema, CRUD tabel, dan sequence; migrasi/seed memakai akun bootstrap. E2E kini memeriksa `rolsuper=false`, tidak ada hak `CREATE` schema, dan ada hak baca tabel runtime.
2. **Sedang — semua pengguna berbagi bucket rate limit Caddy.** Express tidak mempercayai proxy, jadi `req.ip` merujuk koneksi proxy dan limiter dapat membuat login saling terblokir. Perbaikan: percaya satu hop di production karena Caddy adalah reverse proxy tunggal pada Compose. Caddy mengabaikan header forwarded dari klien secara default sebelum menetapkan header proxy. [Dokumentasi reverse_proxy Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
3. **Sedang — password lebih dari 72 byte dipangkas bcrypt.** Sufiks password tidak menambah entropi hash dan bisa diabaikan saat verifikasi. Perbaikan: batas UTF-8 72 byte untuk login, pembuatan/perubahan akun, dan seed; test meliputi ASCII dan Unicode.
4. **Sedang — parser upload hanya membatasi ukuran file.** Multipart field/part tak punya batas eksplisit sehingga dapat menghabiskan memori sebelum validasi DTO. Perbaikan: batasi file, field, ukuran field, dan total part; test memastikan konfigurasi tersebut tetap aktif.

## Verifikasi yang dijalankan

- **Frontend:** lint selesai tanpa error (1 warning lama `window.location.href`); typecheck lulus; 53 test lulus; build production lulus.
- **Backend:** typecheck lulus; 89 unit test lulus; build lulus; lint tanpa error (17 warning `any` lama pada test/service/interceptor).
- **E2E dan migrasi:** tidak dapat dijalankan lokal karena Docker/PostgreSQL tidak tersedia. Workflow CI disiapkan untuk migrasi PostgreSQL, role runtime terbatas, test permission per role, E2E, dan image build; hasil run untuk commit audit harus diperiksa sebelum sign-off.
- **Audit dependency lokal:** registry npm tidak dapat dihubungi dari desktop. Tidak ada dependency baru atau perubahan lockfile.
- **Diff dan secret scan working tree:** `git diff --check` lulus; pemindaian pola credential/private key yang umum tidak menemukan secret di working tree.

## Yang masih menghalangi status READY

- CI terbaru harus hijau, terutama migrasi, privilege role database, E2E hak peran, dependency audit, Compose dan image build.
- Operator perlu mengisi domain, DNS, firewall, secret production, bootstrap Admin, dan menjalankan deploy pertama.
- Sekolah perlu menetapkan retensi/penghapusan surat sakit, data siswa, presensi, dan audit.
- Jadwal backup offsite terenkripsi dan uji restore staging belum dilakukan pada server.
- Pemantauan uptime/disk/backup, pemindaian secret pada seluruh sejarah Git, dan keputusan apakah CSP serta container hardening lanjutan diwajibkan masih perlu dituntaskan.

Karena pengujian integrasi terhadap PostgreSQL produksi, uji restore, dan konfigurasi operasional tersebut belum ada buktinya, hasil audit ini belum menyatakan aplikasi siap menerima data asli.
