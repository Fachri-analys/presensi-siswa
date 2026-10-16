# Sistem Presensi Siswa — SMK Negeri 11 Jakarta

Aplikasi Sistem Presensi Siswa monorepo (Frontend Next.js + Backend NestJS + PostgreSQL + Prisma) untuk pencatatan dan monitoring kehadiran siswa secara real-time, akurat, dan terproteksi hak akses role-based (Ketua Kelas, Guru Piket, Admin).

## Dokumen produk dan handoff

Dokumen spesifikasi produk, sistem, dan integrasi backend tersedia di [docs/README.md](./docs/README.md):

- [PRD](./docs/PRD.md) — tujuan produk, pengguna, fitur MVP, alur, dan aturan bisnis.
- [SRS](./docs/SRS.md) — persyaratan sistem serta kriteria penerimaan yang dapat diuji.
- [Kontrak API](./docs/API-CONTRACT.md) — route, payload, respons, error, autentikasi, dan aturan integrasi.
- [Panduan handoff backend](./docs/BACKEND-HANDOFF.md) — pembagian kerja, arsitektur backend, dan checklist integrasi.

## Struktur repository

```text
app/                 Route dan halaman Next.js (App Router)
components/          Komponen UI dan modal aplikasi
lib/                 Domain types, demo store, dan adapter API layer
backend/             Backend API NestJS 10, Prisma 5, PostgreSQL schema, Docker
public/              Aset statis sekolah
docs/                PRD, SRS, kontrak API, dan handoff backend
tests/               Unit & integration tests frontend (Vitest)
.github/workflows/   CI/CD pipeline multi-job (Frontend & Backend)
CONTRIBUTING.md      Alur kontribusi dan validasi perubahan
```

Panduan branch, commit, pull request, validasi, dan aturan kontribusi ada di [CONTRIBUTING.md](./CONTRIBUTING.md).

## Daftar isi

- [Dokumen produk dan handoff](#dokumen-produk-dan-handoff)
- [Struktur repository](#struktur-repository)
- [Menjalankan dan memeriksa aplikasi](#menjalankan-dan-memeriksa-aplikasi)
- [Tujuan dan istilah](#tujuan-dan-istilah)
- [Peta halaman](#peta-halaman)
- [Peran dan hak akses](#peran-dan-hak-akses)
- [Fitur dan alur kerja](#fitur-dan-alur-kerja)
- [Data saat ini dan batasan simulasi](#data-saat-ini-dan-batasan-simulasi)
- [Perilaku tampilan dan pesan](#perilaku-tampilan-dan-pesan)
- [Struktur kode yang berkaitan](#struktur-kode-yang-berkaitan)
- [Acuan integrasi backend](#acuan-integrasi-backend)
- [Syarat sebelum digunakan di sekolah](#syarat-sebelum-digunakan-di-sekolah)

## Menjalankan dan memeriksa aplikasi

### Kebutuhan

- Node.js >= 20.9.
- npm >= 10.
- Docker Desktop (opsional, untuk database PostgreSQL lokal).

### Perintah Utama

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan frontend Next.js pada `http://localhost:3000` |
| `npm run backend:dev` | Menjalankan backend NestJS API pada `http://localhost:4000` |
| `npm test` | Menjalankan unit & integration test frontend (Vitest, 40 tests) |
| `npm run backend:test` | Menjalankan unit test backend (Jest, 36 tests) |
| `npm run lint` | Menjalankan ESLint pada kode frontend |
| `npm run typecheck` | Memeriksa tipe TypeScript frontend (`tsc --noEmit`) |
| `npm run build` | Build produksi frontend Next.js |
| `npm run backend:build` | Build produksi backend NestJS |
| `npm run docker:db` | Menjalankan container database PostgreSQL via Docker Compose |
| `npm run docker:db:down` | Menghentikan container database PostgreSQL |
| `npm run backend:prisma:generate` | Menghasilkan client Prisma ORM untuk backend |
| `npm run backend:prisma:seed` | Menjalankan seeding data awal ke database backend |

### Akun Uji Coba & Autentikasi Nyata

Pada halaman masuk (`/login`), autentikasi diproses langsung oleh backend API (`/api/v1/auth/login`) menggunakan sesi cookie berbasis `HttpOnly`, `SameSite=lax`, dan password ter-hash bcrypt (12 rounds). Bypass akun demo publik telah dihapus dari antarmuka login.

Untuk pengujian operasional, tersedia 3 akun uji resmi yang dapat diisi melalui migrasi/seed backend:

| Peran | Identifier / Email | Cakupan Hak Akses |
|---|---|---|
| Admin | `admin.test@smkn11jakarta.sch.id` | Akses penuh: Master data (Siswa, Guru, Kelas), Reset Password Akun, Log Aktivitas, Laporan Seluruh Sekolah. |
| Guru Piket | `guru.test@smkn11jakarta.sch.id` | Akses operasional: Presensi semua kelas, Izin Hadir di luar sesi, Monitoring Real-time, Riwayat & Laporan. |
| Ketua Kelas | `ketua.test@smkn11jakarta.sch.id` | Akses terbatas: Presensi rombel kelas **XI PPLG 1**, unggah surat sakit siswa sekelas, riwayat kelasnya sendiri. |

> [!NOTE]
> **Kerahasiaan Kredensial:** Sesuai prinsip *zero-secrets-in-repo*, password akun uji tidak dicantumkan di repositori publik. Password dapat dikonfigurasi melalui environment variable lokal di `backend/.env` atau `.env.test.local` (`TEST_ADMIN_PASSWORD`, `TEST_GURU_PASSWORD`, `TEST_KETUA_PASSWORD`) saat menjalankan `npm run backend:prisma:seed`. Jika variabel tidak disetel, seed akan menghasilkan string acak aman via `crypto.randomBytes`.

Contoh konfigurasi alamat backend ada di `.env.example`. Untuk menghubungkan frontend dengan backend, salin menjadi `.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1/
```

### CI/CD Pipeline

Proyek ini dilengkapi automasi CI/CD pada `.github/workflows/ci.yml` yang berjalan otomatis pada setiap `push` dan `pull_request`:
- **Job Frontend**: Validasi `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (40 tests), `npm run build`, dan `npm audit`.
- **Job Backend**: Validasi `npm ci`, `npx prisma generate`, `npm run lint`, `npm run typecheck`, `npm test` (36 tests), dan `npm run build`.

### Status Pengujian Otomatis

Total **76 test otomatis** berstatus **PASS (100%)**:
- **Vitest (Frontend)**: 13 test suites, 40 tests passed.
- **Jest (Backend)**: 10 test suites, 36 tests passed.

### Teknologi utama

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Vitest, Lucide React, ExcelJS.
- **Backend**: NestJS 10, Prisma ORM 5, PostgreSQL 16, TypeScript 5, Jest, Docker Compose, Helmet, Bcrypt.

## Tujuan dan istilah

Aplikasi membantu sekolah mencatat kehadiran per siswa dan per kelas, memantau kelas, melihat riwayat, mengelola data induk, serta membuat laporan.

- **Ketua Kelas** adalah akun petugas presensi untuk satu kelas, bukan akun setiap siswa.
- **Guru Piket** dapat mengisi dan melihat presensi semua kelas.
- **Admin** mengelola seluruh data dan mempunyai tingkat akses tertinggi.
- Status presensi: **Hadir**, **Terlambat**, **Izin**, **Sakit**, **Alpa**, dan **Belum presensi**.
- Angka **Hadir** mencakup siswa yang **Terlambat**. Terlambat juga ditampilkan sebagai rincian, jadi kedua angka itu tidak boleh dijumlahkan seolah-olah kategori terpisah.
- **Nonaktif** berarti data siswa/guru tidak digunakan dalam operasi aktif, tetapi riwayatnya perlu dipertahankan. **Hapus permanen** hanya dilakukan Admin dan perlu mempertimbangkan keterkaitan data.

## Peta halaman

| URL | Nama di aplikasi | Isi dan batas utama |
|---|---|---|
| `/` | Arahkan ke Masuk | Mengalihkan pengguna ke `/login`. |
| `/login` | Masuk | Form masuk dengan validasi identifier dan password ke backend API resmi. |
| `/dashboard` | Dashboard | Ringkasan dan jalan pintas menyesuaikan peran. |
| `/presensi` | Presensi | Ketua Kelas diarahkan ke presensi kelasnya; Guru Piket dan Admin memilih kelas untuk mengisi presensi. |
| `/siswa` | Siswa | Ketua Kelas hanya daftar kelas tugas; Guru Piket daftar siswa aktif semua kelas; Admin mengelola siswa. |
| `/guru` | Data Guru | Admin mengelola data guru. |
| `/kelas` | Kelas | Admin mengelola kelas dan penugasan Ketua Kelas. |
| `/monitoring` | Monitoring | Guru Piket dan Admin memantau ringkasan semua kelas. |
| `/monitoring/[kelas]` | Detail kelas | Guru Piket dan Admin melihat rincian kelas; Ketua Kelas hanya kelas yang ditugaskan. |
| `/riwayat` | Riwayat | Rekap kehadiran harian menurut kelas dan rentang tanggal. Ketua Kelas dibatasi ke kelas sendiri. |
| `/laporan` | Laporan | Filter periode/status, pratinjau, cetak/Simpan sebagai PDF, dan unduh Excel. |
| `/log-aktivitas` | Log Aktivitas | Guru Piket dan Admin melihat catatan aktivitas yang tersedia pada demo. |
| `/pengaturan` | Pengaturan | Admin mengelola akun demo dan membuat sandi sementara demo; peran lain hanya melihat profil ringkas. |
| URL lain | Tidak ditemukan | Halaman 404 dengan petunjuk kembali. |

## Peran dan hak akses

Aturan produk yang harus dipertahankan pada backend:

| Kemampuan | Ketua Kelas | Guru Piket | Admin |
|---|---:|---:|---:|
| Melihat dashboard | Kelas tugas | Semua kelas | Semua kelas dan ringkasan administrasi |
| Melihat daftar siswa | Hanya kelas tugas | Semua kelas | Semua kelas, termasuk data nonaktif |
| Menambah/mengubah/menghapus data siswa | Tidak | Tidak | Ya |
| Mengaktifkan/menonaktifkan siswa | Tidak | Tidak | Ya |
| Mengisi/mengubah/menghapus catatan presensi | Hanya kelas tugas | Semua kelas | Semua kelas |
| Melihat monitoring dan detail kelas | Hanya kelas tugas | Semua kelas | Semua kelas |
| Melihat riwayat dan membuat laporan | Hanya kelas tugas | Semua kelas | Semua kelas |
| Mencetak/Simpan sebagai PDF dan mengunduh Excel | Laporan kelas tugas | Laporan semua kelas | Laporan semua kelas |
| Melihat log aktivitas | Tidak | Ya | Ya |
| Mengelola data guru | Tidak | Tidak | Ya |
| Mengelola kelas dan menetapkan Ketua Kelas | Tidak | Tidak | Ya |
| Mengelola akun dan meminta reset sandi | Tidak | Tidak | Ya |

Admin memiliki akses ke semua halaman, tetapi aktivitas pencatatan presensi tetap dicatat atas nama Admin yang melakukannya.

### Kondisi implementasi saat ini

Tabel di atas adalah **aturan produk yang dituju**, bukan jaminan keamanan yang sudah diterapkan. Role demo ditentukan dari pencocokan email dan password akun contoh, lalu disimpan di `sessionStorage`. Kredensial demo tertanam di frontend dan dapat dilihat pengguna; jangan diperlakukan sebagai autentikasi aman. Pemeriksaan akses `RoleGate`, menu navigasi, dan filter kelas hanya membatasi tampilan browser. Backend wajib memverifikasi akun dan menolak permintaan yang tidak berizin, termasuk jika seseorang memanggil API langsung atau mengubah data di browser.

Ketua Kelas demo saat ini memakai kelas tetap `XI PPLG 1` (`OWN_CLASS_ID`) dan identitas akun contoh. Setelah backend tersedia, kelas, nama, dan hak akses harus berasal dari profil/sesi akun, bukan konstanta frontend.

## Fitur dan alur kerja

### Masuk dan keluar

1. Pengguna membuka halaman Masuk.
2. Pada demo, pengguna mengisi email dan password dari salah satu akun yang didokumentasikan pada bagian [Akun demo lokal](#akun-demo-lokal); role ditentukan dari akun yang cocok.
3. Email atau password yang tidak cocok ditolak. Pemeriksaan ini hanya simulasi frontend dan bukan autentikasi produksi.
4. Tombol **Keluar** tersedia pada header dan menu samping; sesi demo dihapus dan pengguna kembali ke Masuk.
5. Produksi harus memverifikasi akun di server, mengembalikan sesi aman, dan menentukan role serta kelas akun dari server. Pengguna tidak boleh memilih role saat login produksi.

### Presensi Ketua Kelas

1. Dashboard menampilkan siswa aktif kelas tugas.
2. Pengguna dapat mencari siswa, memfilter status, melihat detail, menambah/mengubah status presensi, dan menghapus catatan presensi.
3. Menghapus presensi mengembalikan catatan menjadi belum presensi; tidak menghapus data siswa.
4. Keterangan bersifat opsional. Waktu presensi dicatat untuk status Hadir/Terlambat.
5. Hasil perubahan disimpan sebagai presensi untuk tanggal berjalan di sesi tab pada demo.
6. Jadwal awal demo adalah sesi pagi 07.00–12.00 dan siang 13.00–17.00 WIB; Admin dapat mengubah jam dan mengunci setiap sesi melalui Pengaturan.
7. Hadir/Terlambat hanya dapat dicatat Ketua Kelas di dalam sesi yang sedang terbuka dan tidak dikunci. Di luar jadwal atau ketika dikunci, Ketua Kelas hanya dapat memilih Izin, Sakit, atau Alpa.
8. Guru Piket dapat memberi izin Hadir/Terlambat di luar jadwal kepada siswa tertentu dari halaman presensi, lalu menyimpan izinnya. Izin berlaku sekali untuk siswa dan tanggal tersebut; setelah dipakai, izin habis. Guru Piket juga dapat langsung mencatat semua status.

### Presensi Guru Piket/Admin

1. Pilih kelas dan tanggal presensi.
2. Cari siswa di kelas, tentukan status untuk masing-masing siswa, lalu simpan.
3. Ringkasan menunjukkan jumlah terisi, belum diisi, Hadir, Terlambat, dan gabungan Izin/Sakit/Alpa.
4. Jika kelas atau tanggal diganti saat masih ada perubahan belum disimpan, aplikasi meminta konfirmasi.
5. Presensi yang disimpan digunakan oleh monitoring, riwayat, dan laporan demo pada kelas/periode yang sama.

### Pengelolaan oleh Admin

- **Siswa:** tambah dengan NIS, nama, dan kelas; ubah data; nonaktifkan/aktifkan kembali; atau hapus dari daftar.
- **Guru:** tambah dengan NIP dan nama; ubah data; nonaktifkan/aktifkan kembali; atau hapus dari daftar.
- **Kelas:** tambah, ubah, hapus, dan pilih Ketua Kelas dari siswa yang tersedia.
- **Akun:** tambah, ubah, dan hapus akun demo. Ketua Kelas wajib ditugaskan ke satu kelas; satu kelas tidak boleh memiliki lebih dari satu akun Ketua Kelas pada validasi UI demo.
- **Reset sandi:** aksi di kelola akun menghasilkan sandi acak sementara yang hanya ditampilkan sebagai simulasi. Aksi ini **tidak** mengubah password maupun mengirim sandi kepada pengguna.
- Perubahan Admin dicatat di log demo jika alur terkait memang memanggil pencatatan aktivitas.
- Nonaktif siswa tidak memasukkannya ke daftar presensi aktif. Data siswa nonaktif tetap dapat ditemukan Admin.

### Monitoring, riwayat, dan laporan

- Monitoring menampilkan ringkasan kelas serta tautan ke detail kelas dan pengisian presensi. Angka untuk kelas yang sudah diisi memakai catatan demo tanggal berjalan; kelas tanpa catatan menggunakan contoh data.
- Riwayat menampilkan jumlah per status per hari, rata-rata kehadiran, jumlah keterlambatan, dan data untuk tindak lanjut. Batas pembacaan riwayat demo maksimal 92 hari kerja terbaru.
- Jika tidak ada catatan tersimpan untuk filter riwayat, pratinjau contoh ditampilkan dan diberi keterangan bahwa itu bukan data tersimpan.
- Laporan memiliki filter kelas/jurusan (kecuali Ketua Kelas yang dikunci ke kelasnya), tanggal, status, dan orientasi.
- **PDF:** tombol membuka dialog cetak browser. Untuk file PDF pilih **Simpan sebagai PDF** pada dialog tersebut.
- **Excel:** workbook `.xlsx` berisi logo, nama sekolah, jurusan, kelas, periode, ringkasan, tabel siswa, autofilter, baris judul tabel untuk cetak, dan pengaturan cetak.
- Laporan demo memakai rekap presensi tersimpan jika tersedia. Jika belum ada, angka contoh dari `lib/mock.ts`/fungsi rekap ditampilkan sebagai pratinjau, bukan data resmi.

### Log aktivitas

Log demo menggunakan kalimat sederhana, waktu aktivitas, tindakan, dan keterangan. Contoh tindakan mencakup presensi, perubahan data oleh Admin, pembuatan sandi sementara demo, dan keluar aplikasi. Log disimpan di sesi tab dan dibatasi hingga 100 catatan terbaru; ini bukan audit log yang tahan perubahan.

## Data saat ini dan batasan simulasi

### Penyimpanan frontend

Data awal dan nilai contoh berasal dari `lib/mock.ts`. Data presensi, role, dan daftar yang dikelola disimpan di `sessionStorage`, bukan database. Jadwal demo disimpan di `localStorage` agar perubahan Admin terlihat di tab browser lain pada perangkat yang sama. Data tersebut tetap bisa diubah pengguna dan bukan sumber kebenaran produksi.

Kunci penyimpanan demo yang digunakan:

| Kunci | Isi |
|---|---|
| `presensi-role` | Pilihan role demo untuk tab saat ini. |
| `presensi-demo-attendance` | Presensi demo menurut tanggal, kelas, dan NIS. |
| `presensi-demo-students` | Daftar siswa demo dan status aktif/nonaktif. |
| `presensi-demo-teachers` | Daftar guru demo dan status aktif/nonaktif. |
| `presensi-demo-activity-log` | Log demo terbaru. |
| `presensi-demo-akun` | Perubahan akun demo di halaman Pengaturan. |
| `presensi-demo-kelas` | Perubahan kelas demo di halaman Kelas. |
| `presensi-demo-schedule` (localStorage) | Jam mulai/selesai dan status kunci sesi pagi/siang. |

**Jangan menganggap isi browser sebagai data sekolah.** Pengguna dapat mengubah `sessionStorage`; jangan menggunakannya untuk otorisasi, data personal produksi, audit resmi, atau cadangan.

### Perbedaan penting dari produksi

- Tidak ada autentikasi akun nyata, pemulihan akun, atau verifikasi password.
- Tidak ada backend, database, API, sesi server, dan sinkronisasi lintas perangkat.
- Role demo yang disimpan browser tidak membuktikan identitas pengguna.
- Jadwal dan izin Hadir luar jadwal demo tersimpan di browser; backend produksi harus menjadi sumber jadwal dan memvalidasi izin Guru Piket di server pada setiap penyimpanan presensi.
- Penugasan Ketua Kelas masih menggunakan konstanta demo.
- Data akun di halaman Admin berasal dari daftar contoh; semua perubahan UI bukan perubahan akun sungguhan.
- Reset password hanya menghasilkan string sementara di browser; belum mengubah kredensial atau mengirim notifikasi aman.
- Data monitoring, riwayat, dan laporan dapat memuat angka contoh saat data presensi tersimpan belum tersedia. Periksa label pratinjau sebelum memakai hasil sebagai laporan sekolah.
- Log aktivitas frontend bisa diubah/dihapus oleh pemilik browser dan tidak memenuhi kebutuhan audit.
- Error teknis dicatat di console untuk debugging; tampilan pengguna seharusnya tetap berupa petunjuk umum. Jangan pernah menampilkan stack trace, detail database, token, atau password.

## Perilaku tampilan dan pesan

- Teks dan validasi ditujukan agar dapat dipahami pengguna nonteknis.
- Pesan kesalahan formulir menjelaskan tindakan koreksi, misalnya field wajib, format NIS, NIS duplikat, format email, atau kelas yang belum dipilih.
- Kesalahan teknis dicatat untuk tim pengembang dan tidak ditampilkan sebagai detail teknis kepada pengguna.
- Halaman error menyediakan tindakan mencoba kembali atau kembali ke tempat aman; alamat salah menunjukkan halaman tidak ditemukan.
- Layout menyediakan tampilan desktop dan mobile; tabel dapat digulir di layar sempit, dan form menggunakan label yang terlihat.
- Tombol aksi destruktif meminta konfirmasi. Hapus catatan presensi tidak sama dengan menghapus data siswa.
- Semua tanggal laporan/riwayat perlu memakai rentang yang dipilih dan zona waktu yang konsisten. Jangan mengasumsikan tanggal hard-coded.
- Istilah “Hadir” selalu disertai keterangan bahwa Terlambat termasuk dalam jumlah Hadir.

## Struktur kode yang berkaitan

| Lokasi | Tanggung jawab |
|---|---|
| `app/` | Route halaman, layout, metadata, error boundary, dan halaman tidak ditemukan. |
| `app/login/page.tsx` | Form masuk demo. |
| `components/app-shell.tsx` | Navigasi, identitas role demo, menu Keluar, dan label data simulasi. |
| `components/role-gate.tsx` | Pembatas tampilan frontend; bukan pengganti otorisasi server. |
| `components/ketua-kelas-dashboard.tsx` | Presensi kelas tetap Ketua Kelas demo. |
| `components/guru-piket-attendance.tsx` | Pemilihan kelas/tanggal dan pengisian presensi Guru Piket/Admin. |
| `components/guru-piket-dashboard.tsx` | Monitoring semua kelas. |
| `components/guru-piket-students.tsx` | Daftar siswa; operasi pengelolaan hanya ditampilkan kepada Admin. |
| `components/admin-teachers.tsx` | Kelola data guru demo. |
| `components/manage-table.tsx` | Tabel CRUD generik untuk kelas dan akun demo. |
| `components/monitoring-class-detail.tsx` | Detail monitoring kelas. |
| `components/student-table.tsx` | Tabel responsif daftar siswa dan status presensi. |
| `app/(app)/riwayat/page.tsx` | Ringkasan riwayat, filter, dan tabel tanggal. |
| `app/(app)/laporan/page.tsx` | Pratinjau cetak dan ekspor Excel. |
| `app/(app)/pengaturan/page.tsx` | Profil pengguna dan kelola akun demo/reset sandi demo. |
| `lib/mock.ts` | Data sekolah, kelas, siswa, akun, riwayat, dan rekap contoh. |
| `lib/demo-session.ts` | Sesi role demo di browser. |
| `lib/demo-attendance.ts` | Penyimpanan dan kalkulasi presensi demo. |
| `lib/demo-students.ts`, `lib/demo-teachers.ts` | Penyimpanan siswa/guru demo. |
| `lib/activity-log.ts` | Penyimpanan log aktivitas demo. |
| `lib/stats.ts`, `lib/types.ts` | Kalkulasi statistik dan tipe domain. |
| `public/` dan `components/logo.tsx` | Aset logo dan favicon sekolah. |
| `lib/data/contracts.ts` | Port/interface bertipe untuk sesi, presensi, master data, monitoring, laporan, dan aktivitas backend. |
| `lib/data/api-client.ts` | Transport JSON umum, sesi cookie, pemetaan error aman untuk UI, dan baca URL dasar dari environment. |
| `lib/data/decoders.ts` | Pemeriksaan bentuk data JSON dari server sebelum dipakai sebagai tipe domain. |
| `.env.example` | Contoh variabel alamat API; tidak berisi secret dan tidak mengaktifkan integrasi sendiri. |

## Acuan integrasi backend

Bagian ini adalah **kontrak usulan untuk dibahas bersama pembuat backend**, bukan API yang sudah tersedia. Teknologi backend, database, format token/sesi, dan URL deployment belum ditetapkan; hindari mengunci frontend pada pilihan tersebut sebelum disepakati.

### Fondasi integrasi yang sudah disiapkan

- `lib/data/contracts.ts` mendefinisikan interface layanan (port) untuk autentikasi, presensi, data sekolah, admin, monitoring, laporan, dan log audit.
- `lib/data/api-client.ts` menyediakan transport JSON bertipe decoder, query parameter, pembatalan permintaan, pengiriman cookie sesi (`credentials: include`), error terstruktur, dan pesan umum Bahasa Indonesia.
- Respons dibaca sebagai `unknown` lalu diperiksa oleh decoder di `lib/data/decoders.ts`; data server yang tidak sesuai kontrak ditolak sebagai respons tidak valid, bukan diasumsikan benar melalui cast.
- `NEXT_PUBLIC_API_BASE_URL` hanya memuat alamat API, tidak boleh memuat token/password. `.env.example` adalah contoh; salin ke `.env.local` untuk pengembangan. `.env.local` diabaikan Git.
- Transport tidak otomatis mencoba ulang permintaan, tidak menampilkan teks mentah error server, tidak menyimpan token ke `localStorage`, dan mewajibkan HTTPS kecuali localhost.

**Batas yang penting:** ini fondasi untuk integrasi berikutnya, belum koneksi backend dan belum adapter implementasi repository. Semua halaman sekarang tetap membaca/menulis data demo. Mengisi `NEXT_PUBLIC_API_BASE_URL` saja tidak mengubah perilaku aplikasi. Saat kontrak API backend tersedia, pekerjaan berikutnya adalah menerapkan adapter repository terhadap route/payload sebenarnya, mengganti komponen agar memakai adapter tersebut, mengganti login demo dengan sesi server, lalu menjalankan pengujian integrasi dan otorisasi. Jangan deploy aplikasi sebagai sistem produksi hanya karena fondasi ini sudah ditambahkan.

### Aturan integrasi yang wajib

1. Sumber kebenaran data adalah backend/database. Hapus penggunaan penyimpanan `sessionStorage` untuk menyimpan data sekolah produksi.
2. Server memverifikasi identitas, status akun, role, dan cakupan kelas pada **setiap** permintaan yang dilindungi.
3. Role tidak diambil dari pilihan pengguna, query string, payload yang tidak dipercaya, atau state browser. Role dan daftar kelas tugas ditentukan server dari akun yang telah terverifikasi.
4. Ketua Kelas hanya dapat membaca/mengubah presensi kelas yang ditugaskan padanya; menebak ID kelas lain harus ditolak di server.
5. Guru Piket dapat membaca semua kelas dan melakukan operasi presensi, tetapi tidak dapat mengelola siswa, guru, kelas, atau akun.
6. Admin dapat mengelola data induk dan akun, melihat seluruh cakupan data, serta melakukan presensi sesuai kebijakan sekolah.
7. Semua operasi perubahan memvalidasi input di server, menggunakan transaksi bila satu perubahan memengaruhi beberapa tabel, dan menghasilkan respons sukses/gagal yang jelas.
8. Log audit ditulis di server dalam transaksi yang sesuai, tidak dapat diedit oleh pengguna biasa, dan tidak menyimpan password, token, atau sandi sementara dalam bentuk plaintext.
9. UI menampilkan pesan umum yang mudah dimengerti. Detail teknis disimpan di log server dengan request/correlation ID; jangan kirim rahasia atau stack trace ke browser.
10. Penanganan timeout, tidak ada koneksi, sesi kedaluwarsa, konflik data, dan kegagalan simpan harus memiliki perilaku yang jelas; kegagalan tidak boleh terlihat seperti sukses.
11. Tentukan strategi cookie dan CSRF bersama backend. Pilihan yang disarankan adalah cookie sesi `HttpOnly`, `Secure`, `SameSite` yang sesuai; jangan menyimpan access token rahasia di `localStorage`. Jika API beda origin, CORS harus membatasi origin frontend yang diizinkan dan konfigurasi kredensial secara eksplisit.
12. Sepakati envelope respons, tipe ID (string stabil), representasi tanggal/zona waktu, kode error stabil, bentuk paginasi, dan bentuk respons 204 sebelum menulis adapter. `api-client.ts` tidak mengarang atau menafsirkan teks error server.

### Entitas data yang disarankan

Nama tabel/kolom adalah rancangan konseptual dan dapat disesuaikan dengan skema backend.

| Entitas | Data penting | Aturan |
|---|---|---|
| Akun/Pengguna | ID, email/username, hash password, role, status akun, waktu dibuat/diubah | Kredensial tidak pernah dikirim kembali sebagai password; Admin mengelola akun. |
| Guru | ID, NIP unik, nama, status aktif/nonaktif | NIP dinormalisasi dan unik; nonaktif tidak berarti menghapus riwayat. |
| Siswa | ID, NIS unik, nama, kelas, status aktif/nonaktif | Hanya Admin mengelola. Siswa nonaktif dikecualikan dari presensi baru. |
| Kelas | ID, nama, jurusan/program, status | Ketua Kelas terhubung lewat penugasan akun, bukan hanya nama yang dikirim client. |
| Penugasan Ketua Kelas | Akun, kelas, waktu berlaku/status | Satu akun Ketua Kelas mempunyai cakupan kelas yang ditetapkan sekolah; UI sekarang membatasi satu akun per kelas. |
| Presensi | ID, tanggal lokal sekolah, kelas, siswa, status, waktu, keterangan, pembuat/pengubah | Satu catatan per siswa/kelas/tanggal; status tervalidasi; simpan perubahan secara atomik. |
| Audit aktivitas | Aktor, tindakan, objek, waktu, hasil, request ID, metadata aman | Ditulis server-side; jangan catat password atau rahasia. |

Definisi kalender sekolah (hari belajar, libur, tanggal efektif), zona waktu resmi, aturan koreksi presensi, lama penyimpanan, dan kebijakan penghapusan perlu disepakati sebelum perhitungan laporan produksi dianggap final.

### Contoh kelompok endpoint yang disarankan

Format di bawah hanya gambaran resource. Nama route, payload, paginasi, dan kode respons perlu disepakati dengan backend.

| Kelompok | Contoh operasi | Cakupan yang diharapkan |
|---|---|---|
| Sesi | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Backend mengautentikasi akun dan mengembalikan profil/role/cakupan kelas. |
| Siswa | `GET /students`, `POST /students`, `PATCH /students/{id}`, `POST /students/{id}/deactivate`, `DELETE /students/{id}` | Perubahan hanya Admin; `GET` dibatasi kelas sesuai role; penghapusan permanen mengikuti kebijakan referensi/retensi. |
| Guru | `GET /teachers`, `POST /teachers`, `PATCH /teachers/{id}`, operasi status/hapus | Hanya Admin. |
| Kelas | `GET /classes`, `POST /classes`, `PATCH /classes/{id}`, `DELETE /classes/{id}`, operasi penugasan Ketua Kelas | Guru Piket melihat semua; Ketua Kelas hanya kelas tugas; perubahan hanya Admin. |
| Akun | `GET /users`, `POST /users`, `PATCH /users/{id}`, `DELETE /users/{id}` | Hanya Admin; role/cakupan yang disimpan harus divalidasi backend. |
| Reset sandi | `POST /users/{id}/password-reset` | Admin meminta reset; backend menerapkan alur aman (misalnya tautan/token sekali pakai atau kanal resmi), bukan mengirim password plaintext di respons. |
| Presensi | `GET /attendance`, `PUT /attendance/{classId}/{date}`, `PATCH /attendance/{recordId}`, `DELETE /attendance/{recordId}` | Ketua Kelas dibatasi kelas tugas; Guru Piket/Admin semua kelas; backend menolak NIS tidak aktif atau siswa di kelas berbeda. |
| Monitoring | `GET /monitoring?date=...`, `GET /monitoring/classes/{id}` | Ringkasan dihitung dari catatan presensi dan jumlah siswa aktif server. |
| Riwayat/laporan | `GET /attendance/history`, `GET /reports/attendance` | Filter periode/kelas/status dan kalkulasi konsisten dengan definisi hari sekolah backend. |
| Audit | `GET /audit-logs` | Baca sesuai kebijakan; Guru Piket dan Admin sesuai aturan produk, catatan ditulis backend. |

API perlu mengembalikan skema validasi yang dapat dipetakan menjadi pesan pengguna, misalnya NIS/NIP/email duplikat, akun tidak aktif, kelas tidak ditemukan, akses ditolak, konflik presensi, dan sesi kedaluwarsa. Jangan bergantung pada teks pesan internal server sebagai teks UI.

### Perubahan frontend saat backend dihubungkan

- Bentuk adapter/data-access layer typed untuk sesi, siswa, guru, kelas, akun, presensi, monitoring, riwayat, laporan, dan audit.
- Implementasikan interface pada `lib/data/contracts.ts` terhadap kontrak API final; filter query di client hanyalah permintaan, sementara cakupan kelas dan role tetap harus diputuskan server.
- Buat test untuk decoder respons, pemetaan error, sesi kedaluwarsa, validasi server, konflik, pembatasan role/cakupan kelas, dan permintaan simpan yang gagal.
- Ganti import sumber data contoh pada komponen dengan pemanggilan adapter; jangan menaruh `fetch` berulang di banyak komponen.
- Tambahkan status memuat, kosong, sukses, gagal, mencoba ulang, sesi habis, dan konflik secara konsisten.
- Setelah aksi simpan, tampilkan keberhasilan hanya sesudah server mengonfirmasi. Untuk perubahan optimistis, pulihkan nilai lama jika server menolak.
- Gunakan paginasi/filter server untuk daftar besar. Pastikan filter role tidak hanya diterapkan di UI.
- Tangani kelas atau siswa yang menjadi nonaktif saat halaman terbuka; refresh data dan jelaskan bahwa perubahan perlu dimuat ulang bila diperlukan.
- Sediakan ekspor dari data terverifikasi server atau pastikan seluruh data/filter laporan yang diekspor memang telah dimuat dan berizin.
- Hapus pilihan role pada login produksi dan label **Data simulasi** setelah semua alur produksi benar-benar memakai backend.
- Pertahankan bahasa sederhana, layout responsif, label, akses keyboard, dialog konfirmasi, dan perilaku error yang aman.

## Kesiapan sebelum digunakan di sekolah

- [x] Backend NestJS, skema PostgreSQL Prisma, konfigurasi environment, dan kontrak API telah selesai dan terintegrasi.
- [x] Login nyata via cookie session `HttpOnly`, logout/pencabutan sesi, dan hashing bcrypt (12 rounds) telah teruji.
- [x] Otorisasi server menegakkan matriks role (Admin, Guru Piket, Ketua Kelas) dan pencegahan IDOR cakupan kelas pada semua route API.
- [x] Data siswa (NIS unik), guru (NIP unik), kelas, akun, dan penugasan tervalidasi dengan ID stabil.
- [x] Presensi tersimpan permanen dan atomik (`$transaction`), idempotent, serta perubahan terlacak di audit log.
- [x] Ketua Kelas ditolak oleh backend (`403 Forbidden`) jika mencoba melihat atau mengubah data kelas lain.
- [x] Guru Piket tidak memiliki akses CRUD akun/pengguna; Admin adalah satu-satunya role pengelola data induk.
- [x] Unggah surat izin/sakit aman dengan MIME type whitelist, batas 5 MB, dan sanitasi nama file hash UUID (anti path-traversal).
- [x] Monitoring real-time, riwayat, laporan, persentase, dan keterlambatan dihitung via query terindeks tanpa N+1.
- [x] Ekspor Excel (.xlsx via ExcelJS) dan cetak PDF terverifikasi dengan kop dan logo SMKN 11 Jakarta.
- [x] Log audit server mencatat seluruh aktivitas sensitif beserta ID akun aktor, IP address, dan timestamp.
- [x] Kredensial pengujian disimpan terisolasi di `.env.test.local` (diabaikan oleh Git, zero-secrets di repo).
- [x] Total 76 pengujian otomatis (40 Vitest frontend + 36 Jest backend) lulus 100% tanpa kegagalan.
- [x] Validasi CI/CD linting, typecheck, build, dan dependency hardening lulus bersih.

## Operasional Produksi & Pemeliharaan

### 1. Deployment via Docker Multi-Stage
Aplikasi menyediakan konfigurasi Dockerfile siap produksi dengan user non-root (UID 1001):
```bash
# Build & jalankan backend container
docker build -t presensi-backend:latest ./backend
docker run -d --name presensi-api -p 4000:4000 --env-file backend/.env presensi-backend:latest

# Build & jalankan frontend container
docker build -t presensi-frontend:latest .
docker run -d --name presensi-web -p 3000:3000 --env-file .env.production presensi-frontend:latest
```

### 2. Prosedur Backup Database
Jalankan pencadangan terkompresi secara rutin:
```bash
docker exec -t presensi-postgres pg_dump -U presensi -d presensi_dev --format=custom --blobs | gzip > backup_presensi_$(date +%Y%m%d_%H%M%S).dump.gz
```

### 3. Prosedur Pemulihan Database (Restore)
```bash
gunzip -c backup_presensi_YYYYMMDD_HHMMSS.dump.gz > backup.dump
docker exec -i presensi-postgres pg_restore -U presensi -d presensi_dev --clean --if-exists backup.dump
```

## Riwayat perubahan dokumentasi

- **16 Oktober 2026:** Integrasi penuh frontend-backend diselesaikan. Bypass demo accounts dan password terbuka dihapus dari login. Dilengkapi validasi berkas surat sakit multipart, proteksi IDOR, optimasi pencegahan N+1 query, Dockerfile non-root multi-stage, isolasi kredensial lokal via `.env.test.local`, dan verifikasi 76 automated tests lulus 100%.
- **3 Oktober 2026:** README diperluas menjadi acuan fitur, peta halaman, aturan peran, perilaku data simulasi, pekerjaan integrasi backend, rancangan entitas/API, dan checklist sebelum digunakan di sekolah. Status audit dependency dicatat sebagai kondisi pada pemeriksaan terakhir, bukan jaminan kondisi versi berikutnya.
