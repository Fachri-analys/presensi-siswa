# Audit Keamanan Aplikasi

**Tanggal:** 1 November 2026 (audit ulang pada commit `449ba97` dan perubahan kerja setelahnya)
**Cakupan:** repository Next.js/NestJS/Prisma, API, autentikasi/otorisasi, schema/migrasi, dependency lockfile, CI, Docker Compose, dan skrip deploy/backup.  
**Kesimpulan:** **NOT READY FOR PRODUCTION**. CI pada commit `3c7dac7` lulus, termasuk audit dependency, Prisma migration, unit/E2E, container build, Compose runtime, CSP nonce, serta backup/restore SQLite. Deployment awal, backup offsite, restore staging sekolah, dan penerapan retensi enam bulan pada data operasional belum dibuktikan.

> **Pembaruan 1 November 2026:** Aplikasi, Prisma, CI, dan Compose menggunakan SQLite; temuan khusus PostgreSQL di bawah adalah historis. Audit menelusuri entry point, guard, controller/service domain, query Prisma, upload, ekspor, config, Docker, Compose, workflow CI, dan skrip operasional. Perubahan menambahkan CSP nonce tanpa `unsafe-inline`, menghapus inline style attributes pada progress bars, memverifikasi provenance braces patch, menetapkan kebijakan retensi enam bulan, dan menambahkan CI runtime/backup-restore smoke test. Production build dan nonce rotasi terbukti lokal; [run CI 41231591706](https://github.com/Fachri-analys/presensi-siswa/actions/runs/41231591706) lulus audit dependency, migrasi, unit/E2E, container, CSP, dan SQLite backup/restore di stack disposable. `npm audit` desktop tetap tidak dapat menjangkau registry npm; audit dependency CI lulus. Docker CLI dan staging nyata tidak tersedia. Status tetap **NOT READY FOR PRODUCTION** sampai deployment production dan backup/restore staging terverifikasi.

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
| 22 | Hak Guru Piket/Ketua/Admin | LULUS PADA E2E CI | Review controller menunjukkan akun hanya Admin; operasi tulis siswa/kelas/guru juga Admin; presensi membatasi operasi tertentu pada Guru/Admin; akses Ketua dibatasi `kelasId` di controller/service. E2E lulus di CI dengan fixture terisolasi. | — |
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
| 33 | Content Security Policy frontend | LULUS | CSP memakai nonce acak per request, `strict-dynamic`, dan menolak inline script/style attributes tanpa `unsafe-inline`. Dua progress bar yang sebelumnya memakai `style=` kini memakai SVG. Test lokal dan runtime CI memastikan nonce header/HTML cocok, berotasi per request, dan tak ada style attribute inline. | — |
| 34 | Kebocoran detail error | LULUS | Exception filter merespons pesan umum untuk error server; stack hanya masuk log server. | — |
| 35 | Kebocoran secret di log | LULUS | Logging HTTP mencatat method/path/status/durasi; tidak mencatat body, password, atau cookie. | — |
| 36 | Audit aksi sensitif | LULUS DENGAN BATASAN | Perubahan penting dan ekspor dicatat. Kegagalan penyimpanan audit dilog tetapi tidak membatalkan aksi utama; log berada pada DB aplikasi, bukan penyimpanan immutable terpisah. | P2 bila butuh bukti tamper-proof |
| 37 | Retensi dan penghapusan PII | KEBIJAKAN DITETAPKAN; ENFORCEMENT PENDING | Pemilik project menetapkan enam bulan untuk data siswa nonaktif, presensi, surat, log audit, dan backup; tertulis di `docs/DATA-RETENTION-POLICY.md`. Tidak ada data yang dihapus. Schema belum menyimpan tanggal nonaktif/kelulusan siswa; backup script juga belum menghapus file lama. Penghapusan otomatis memerlukan penanda tanggal, dry-run, dan persetujuan operator. | P2 operasional |
| 38 | Secret dan file environment | LULUS SEBAGIAN | File environment nyata di-ignore; file yang dilacak adalah template. Pemindaian seluruh sejarah Git belum dilakukan dengan secret scanner khusus. | P2 sampai history scan |
| 39 | Dependency dan supply chain | LULUS | Override root mematok `braces@3.0.3` ke commit GitHub tetap dengan SHA-512 di lockfile; package hanya dependency dev melalui ESLint/Next. Commit memuat depth limit 100 dan test regresi. Provenance tercatat di `docs/DEPENDENCY-PATCHES.md`; advisori GitHub terkait telah ditarik. `npm audit --audit-level=high` frontend dan backend lulus di CI. | — |
| 40 | Database dan container production | SMOKE TEST CI LULUS; STAGING BELUM | CI menemukan Dockerfile memeriksa `/health/db`, sedangkan backend memasang health endpoint di `/api/v1/health/db`; probe sudah diperbaiki. Run CI menyalakan Compose, menunggu health, memverifikasi CSP, membuat backup, memulihkan ke file terpisah, memeriksa integritas/FK/jumlah baris, dan membaca DB pulih lewat Prisma; seluruh langkah lulus. Restore di staging sekolah dan backup offsite belum dibuktikan. Image masih memakai tag yang dapat berubah. | P2 operasional |

## Temuan terkonfirmasi dan perbaikan

1. **Temuan historis (tersupersesi) — API memakai akun PostgreSQL superuser.** Ini berlaku pada konfigurasi yang diaudit 26 Oktober, sebelum migrasi database. Saat itu Compose membangun `DATABASE_URL` API dari `POSTGRES_USER`; dokumentasi image resmi PostgreSQL menyatakan akun tersebut dibuat dengan hak superuser. [Sumber resmi image PostgreSQL](https://hub.docker.com/_/postgres). Konfigurasi PostgreSQL dan service `db-init` telah dihapus dari runtime; aplikasi kini memakai SQLite. Temuan ini bukan kerentanan pada konfigurasi aktif.
2. **Sedang — semua pengguna berbagi bucket rate limit Caddy.** Express tidak mempercayai proxy, jadi `req.ip` merujuk koneksi proxy dan limiter dapat membuat login saling terblokir. Perbaikan: percaya satu hop di production karena Caddy adalah reverse proxy tunggal pada Compose. Caddy mengabaikan header forwarded dari klien secara default sebelum menetapkan header proxy. [Dokumentasi reverse_proxy Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
3. **Sedang — password lebih dari 72 byte dipangkas bcrypt.** Sufiks password tidak menambah entropi hash dan bisa diabaikan saat verifikasi. Perbaikan: batas UTF-8 72 byte untuk login, pembuatan/perubahan akun, dan seed; test meliputi ASCII dan Unicode.
4. **Sedang — parser upload hanya membatasi ukuran file.** Multipart field/part tak punya batas eksplisit sehingga dapat menghabiskan memori sebelum validasi DTO. Perbaikan: batasi file, field, ukuran field, dan total part; test memastikan konfigurasi tersebut tetap aktif.
5. **Sedang — pengelolaan akun dapat menghilangkan Admin terakhir.** Perbaikan: hitung Admin aktif di transaksi saat demosi, deaktivasi, atau penghapusan; tes E2E termasuk dua penghapusan bersamaan memastikan minimal satu Admin aktif tetap ada.
6. **Sedang — siswa dapat masuk ke kelas nonaktif.** Perbaikan: backend menolak pembuatan/pemindahan ke kelas nonaktif; kelas historis yang sama tetap dapat dipertahankan saat data lain diedit.
7. **Sedang — daftar siswa dan hitungan kelas hanya akurat untuk 100 hasil pertama.** Perbaikan: layar pengelolaan memakai pagination, pencarian, filter, dan total dari backend; tes API dengan 105 siswa memeriksa total serta halaman kedua.
8. **Sedang — file surat sakit dapat tertinggal saat siswa dihapus.** Perbaikan: file dibersihkan setelah transaksi penghapusan berhasil, path dibatasi pada direktori upload, dan transaksi gagal tidak menghapus file. Skrip `npm run uploads:audit` hanya melaporkan file yatim/hilang.
9. **Sedang — skrip load test sebelumnya memakai target dan autentikasi yang tidak sesuai serta tidak menggagalkan ambang.** Perbaikan: skrip memakai HTTP/HTTPS, sesi Admin uji, sampel terbatas, status/ambang yang dicek, dan exit code gagal; diuji terhadap server tiruan sukses dan 503.

## Verifikasi yang dijalankan

- **Frontend:** 55 tes dari 18 file lulus; typecheck dan production build lulus dengan API HTTPS dummy; lint lulus dengan 1 warning `window.location.href` di `lib/data/api-client.ts:165`. Server production lokal mengembalikan `/login` status 200, script HTML membawa nonce CSP yang cocok, nonce berotasi per request, tidak ada `unsafe-inline` maupun style attributes inline.
- **Backend:** 97 tes unit dari 23 suite lulus; typecheck dan build lulus. Lint lulus dengan 17 warning `any` (terutama test, interceptor, dan satu formatter user service).
- **E2E dan migrasi:** Prisma `validate` dan `migrate status` lulus lokal. CI menjalankan `migrate deploy` pada SQLite baru dan seluruh E2E lulus. Tidak ada database data aplikasi yang dipakai atau di-reset.
- **Operasional:** skrip load test pernah diuji pada server HTTP tiruan (termasuk respons 503) dan skrip audit lampiran pernah diuji pada DB/direktori temporer. Runtime Compose dan pemulihan SQLite lulus di runner CI terisolasi, termasuk pemeriksaan integritas, foreign key, jumlah baris, dan pembacaan dengan Prisma. Uji tersebut bukan restore staging/offsite. Docker CLI tidak tersedia lokal.
- **Audit dependency:** registry tidak terjangkau dari desktop, tetapi `npm audit --audit-level=high` frontend/backend lulus pada CI. Provenance serta isi braces patch diverifikasi terhadap PR upstream dan dikunci dengan hash; test regresi memeriksa perilakunya.
- **Staging:** tidak tersedia; load test aplikasi nyata, deploy, backup offsite, restore, serta smoke test pascadeploy belum dilakukan.
- **Diff dan secret scan working tree:** perubahan pada audit ulang dibatasi pada CSP, visualisasi progress agar patuh CSP, pemeriksaan restore, workflow CI, dan dokumentasi dependensi/retensi/audit. Pemindaian pola secret seluruh sejarah Git belum dilakukan; jangan anggap working-tree scan sebagai bukti bahwa riwayat bersih.

## Yang masih menghalangi status READY

- Operator perlu mengisi domain, DNS, firewall, secret production, bootstrap Admin, dan menjalankan deploy pertama.
- Kebijakan retensi enam bulan sudah dicatat, tetapi belum ada job yang menghapus data lama; tanggal nonaktif siswa belum tersimpan. Tidak ada purge yang dijalankan.
- Backup offsite terenkripsi dan uji restore pada server staging nyata belum dilakukan. CI smoke test menguji stack disposable, bukan server sekolah.
- Pemantauan uptime/disk/backup, pemindaian secret pada seluruh sejarah Git, dan penetapan image release tetap masih perlu dituntaskan.

Audit ini belum membuktikan pemulihan database production atau impor data PostgreSQL lama. Database lama tidak tersedia di lingkungan dev. Runtime Compose dan restore file SQLite sudah lulus di CI disposable, tetapi deployment production dan restore pada staging sekolah tetap perlu dibuktikan. Karena itu, aplikasi belum dinyatakan siap produksi sampai prosedur impor (jika ada data lama), backup offsite, restore staging, dan konfigurasi server production diverifikasi.
