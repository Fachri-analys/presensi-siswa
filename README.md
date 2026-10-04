# Sistem Presensi Siswa — SMK Negeri 11 Jakarta

Dokumen ini adalah acuan fitur, perilaku, batasan, dan pekerjaan integrasi untuk frontend Sistem Presensi Siswa. Aplikasi yang ada sekarang adalah **frontend tahap awal**. Saat backend sekolah disambungkan, aplikasi harus menggunakan akun, data, dan hak akses dari backend; mekanisme simulasi tidak boleh menjadi sumber data produksi.

## Dokumen produk dan handoff

Dokumen yang dirancang khusus untuk menyepakati pekerjaan backend tersedia di [docs/README.md](./docs/README.md):

- [PRD](./docs/PRD.md) — tujuan produk, pengguna, fitur MVP, alur, dan aturan bisnis.
- [SRS](./docs/SRS.md) — persyaratan sistem serta kriteria penerimaan yang dapat diuji.
- [Usulan kontrak API](./docs/API-CONTRACT.md) — route, payload, respons, error, autentikasi, dan pertanyaan integrasi.
- [Panduan handoff backend](./docs/BACKEND-HANDOFF.md) — pembagian kerja, keputusan yang sudah disepakati, dan checklist.

Dokumen API masih draf, dan frontend tetap memakai data demo sampai adapter backend diimplementasikan. Sepakati keputusan terbuka bersama sebelum mengunci endpoint atau memulai integrasi.

## Struktur repository

```text
app/                 Route dan halaman Next.js
components/           Komponen UI
lib/                  Domain, demo store, utilitas, dan fondasi API
public/                Aset sekolah
docs/                  PRD, SRS, usulan API, dan handoff backend
CONTRIBUTING.md        Alur kontribusi dan validasi perubahan
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

- Node.js yang mendukung Next.js 16.
- npm.

### Perintah

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

### Akun demo lokal

Pada halaman masuk, role ditentukan dari kredensial akun; tidak ada pemilih role. Gunakan salah satu akun berikut untuk mencoba tampilan setiap peran:

| Peran | Email | Password |
|---|---|---|
| Ketua Kelas | `aisyah.putri@smkn11jakarta.sch.id` | `demo-ketua-2026` |
| Guru Piket | `piket.senin@smkn11jakarta.sch.id` | `demo-guru-2026` |
| Admin | `admin@smkn11jakarta.sch.id` | `demo-admin-2026` |

Kredensial ini tertanam di frontend dan hanya untuk simulasi lokal—bukan rahasia maupun autentikasi produksi. Backend produksi harus memverifikasi password, menentukan role dari akun tersimpan di server, dan menolak akses yang tidak sesuai; jangan gunakan password demo tersebut untuk akun sekolah.

Contoh konfigurasi alamat backend ada di `.env.example`. Untuk uji lokal, salin menjadi `.env.local` lalu ubah URL sesuai server API. File `.env.local` tidak boleh dimasukkan ke Git. Konfigurasi ini baru menyiapkan alamat; UI demo **belum** mengirim permintaan ke backend.

```bash
npm run lint
npm run build
npm start
```

`npm start` menjalankan hasil build produksi. Jalankan `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build` sebelum perubahan digabung. Pengujian otomatis meliputi helper statistik/rekap, decoder data, serta guard URL API; pengujian manual seluruh alur, browser, dan backend yang terhubung tetap diperlukan sebelum rilis.

Header keamanan dasar sudah aktif. Content Security Policy (CSP) yang ketat belum diterapkan karena integrasinya perlu mempertimbangkan nonce untuk skrip Next.js.

Vitest ditingkatkan ke lini 4.1.11 agar memakai `@vitest/mocker` yang telah diperbaiki dan tetap mendukung Node.js 20.9+. Untuk `braces`, belum ada rilis npm yang memperbaiki CVE-2026-93687; dependency dev dipatok ke commit perbaikan yang telah ditinjau pada [PR upstream](https://github.com/micromatch/braces/pull/72). Perbarui override ke rilis resmi setelah tersedia. `npm audit` masih dapat menandai `braces@3.0.3` berdasarkan versi metadata commit tersebut meskipun kode guard nesting sudah terpasang; ini bukan klaim bahwa seluruh audit dependency bersih.

Pemeriksaan terakhir pada 3 Oktober 2026: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (5 file, 13 tes), dan `npm run build` lulus. Uji regresi dependency memastikan `braces` menolak nesting lebih dari 100 tingkat. Walkthrough browser pada Edge lulus untuk Ketua Kelas (login, tambah/hapus presensi, riwayat, banner laporan contoh, ekspor contoh dinonaktifkan, logout), Guru Piket (login, simpan/hapus presensi, riwayat tersimpan, unduh Excel, logout), dan Admin (login, dashboard/pengaturan akun, simpan/kosongkan presensi, riwayat, laporan, logout). Halaman login melalui HTTP pada alamat jaringan lokal merespons 200; header `nosniff`, `strict-origin-when-cross-origin`, pembatasan kamera/mikrofon/geolokasi, dan `DENY` terverifikasi. Browser tidak mencatat error konsol atau error halaman pada alur tersebut.

`npm audit --omit=dev` melaporkan 0 kerentanan. Audit seluruh dependency masih melaporkan 5 high pada rantai `eslint-config-next` → `fast-glob` → `micromatch` → `braces`. Kode `braces` dipatok ke commit perbaikan upstream, tetapi metadata paket commit masih bernomor `3.0.3` sehingga npm audit tetap mencocokkannya dengan advisory. Belum ada rilis npm resmi yang diperbaiki; ganti override dengan rilis resmi begitu tersedia. Tidak menurunkan `eslint-config-next` ke versi 14 karena itu perubahan mayor yang tidak cocok dengan Next.js 16.

### Teknologi utama

- Next.js 16 App Router
- React 19 dan TypeScript
- Tailwind CSS 4
- ExcelJS untuk workbook Excel
- Lucide React untuk ikon
- Inter Variable untuk tipografi

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
| `/login` | Masuk | Form masuk tanpa pemilih role; akun demo menentukan tampilan peran. Bukan autentikasi produksi. |
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

Tabel di atas adalah **aturan produk yang dituju**, bukan jaminan keamanan yang sudah diterapkan. Role saat ini disimulasikan oleh pilihan pada halaman masuk dan disimpan di `sessionStorage`. Pemeriksaan akses `RoleGate`, menu navigasi, dan filter kelas hanya membatasi tampilan browser. Backend wajib menolak permintaan yang tidak berizin, termasuk jika seseorang memanggil API langsung atau mengubah data di browser.

Ketua Kelas demo saat ini memakai kelas tetap `XI PPLG 1` (`OWN_CLASS_ID`) dan identitas akun contoh. Setelah backend tersedia, kelas, nama, dan hak akses harus berasal dari profil/sesi akun, bukan konstanta frontend.

## Fitur dan alur kerja

### Masuk dan keluar

1. Pengguna membuka halaman Masuk.
2. Pada demo, pengguna memilih peran lalu mengisi username/email dan password yang tidak kosong.
3. Demo menerima nilai apa pun yang tidak kosong; tidak ada pencocokan akun atau password.
4. Tombol **Keluar** tersedia pada header dan menu samping; sesi demo dihapus dan pengguna kembali ke Masuk.
5. Produksi harus memverifikasi akun di server, mengembalikan sesi aman, dan menentukan role serta kelas akun dari server. Pengguna tidak boleh memilih role saat login produksi.

### Presensi Ketua Kelas

1. Dashboard menampilkan siswa aktif kelas tugas.
2. Pengguna dapat mencari siswa, memfilter status, melihat detail, menambah/mengubah status presensi, dan menghapus catatan presensi.
3. Menghapus presensi mengembalikan catatan menjadi belum presensi; tidak menghapus data siswa.
4. Keterangan bersifat opsional. Waktu presensi dicatat untuk status Hadir/Terlambat.
5. Hasil perubahan disimpan sebagai presensi untuk tanggal berjalan di sesi tab pada demo.

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

Data awal dan nilai contoh berasal dari `lib/mock.ts`. Data yang berubah disimpan di `sessionStorage`, bukan database. Perubahan tidak disinkronkan antar tab, browser, perangkat, atau pengguna dan umumnya hilang ketika sesi tab berakhir.

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

**Jangan menganggap isi browser sebagai data sekolah.** Pengguna dapat mengubah `sessionStorage`; jangan menggunakannya untuk otorisasi, data personal produksi, audit resmi, atau cadangan.

### Perbedaan penting dari produksi

- Tidak ada autentikasi akun nyata, pemulihan akun, atau verifikasi password.
- Tidak ada backend, database, API, sesi server, dan sinkronisasi lintas perangkat.
- Role yang dipilih browser tidak membuktikan identitas pengguna.
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

## Syarat sebelum digunakan di sekolah

- [ ] Backend, skema database, konfigurasi environment, API, dan kontrak error disepakati serta didokumentasikan.
- [ ] Login nyata, logout/pencabutan sesi, akun nonaktif, dan pemulihan/reset sandi aman sudah teruji.
- [ ] Otorisasi server menegakkan matriks role dan cakupan kelas untuk semua route/API.
- [ ] Data siswa, guru, kelas, akun, dan penugasan tervalidasi, memiliki ID stabil, dan aturan keunikannya diuji.
- [ ] Presensi tersimpan permanen, idempotent, benar untuk tanggal/zona waktu sekolah, serta perubahan/penghapusan terlacak.
- [ ] Ketua Kelas tidak bisa melihat atau mengubah kelas lain dengan mengganti URL/request.
- [ ] Guru Piket tidak bisa melakukan CRUD data pengguna; Admin satu-satunya role untuk pengelolaan data tersebut.
- [ ] Data nonaktif tidak muncul pada presensi baru dan tetap ditangani dengan benar di laporan/riwayat lama.
- [ ] Monitoring, riwayat, laporan, persentase, keterlambatan, hari efektif, dan total siswa cocok dengan data uji yang disepakati.
- [ ] PDF/Excel diuji pada data kecil dan besar, nama sekolah/logo benar, tidak memotong kolom, dan tidak membocorkan kelas di luar izin.
- [ ] Log audit server mencatat aktor, aksi, objek, hasil, waktu, dan konteks aman untuk semua perubahan sensitif.
- [ ] Data sensitif tidak dikirim ke console browser, pesan error, URL, atau log yang dapat dilihat pengguna.
- [ ] Loading, tidak ada data, validasi, gagal jaringan, timeout, konflik, akses ditolak, sesi habis, dan pemulihan sudah diuji.
- [ ] Uji manual setiap peran, perangkat mobile/desktop, keyboard, dialog, print preview, file Excel, serta seluruh route terlindungi sudah lulus.
- [ ] `npm run lint`, `npm run build`, pengujian otomatis frontend/API, dan pemeriksaan keamanan dependency lulus dalam pipeline rilis.
- [ ] Backup, retensi, pemulihan data, monitoring operasional, dan penanggung jawab dukungan sekolah ditentukan.

## Riwayat perubahan dokumentasi

- **3 Oktober 2026:** README diperluas menjadi acuan fitur, peta halaman, aturan peran, perilaku data simulasi, pekerjaan integrasi backend, rancangan entitas/API, dan checklist sebelum digunakan di sekolah. Status audit dependency dicatat sebagai kondisi pada pemeriksaan terakhir, bukan jaminan kondisi versi berikutnya.
