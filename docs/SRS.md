# Software Requirements Specification (SRS)

- **Produk:** Sistem Presensi Siswa — SMK Negeri 11 Jakarta
- **Status:** Draf persyaratan MVP, diturunkan dari [PRD.md](./PRD.md)
- **Tanggal:** 3 Oktober 2026

## 1. Tujuan dan batas

Dokumen ini mendefinisikan perilaku sistem yang harus dipenuhi backend dan frontend ketika frontend demo dihubungkan ke API. Syarat akses di dokumen ini harus ditegakkan server-side; UI bukan batas keamanan.

## 2. Aktor dan role

- **Pengguna anonim:** belum memiliki sesi terverifikasi.
- **Ketua Kelas:** pengguna terautentikasi dengan penugasan kelas yang masih berlaku.
- **Guru Piket:** pengguna terautentikasi yang dapat mengakses presensi semua kelas.
- **Admin:** pengguna terautentikasi yang dapat mengelola seluruh data.

Matriks otorisasi:

| Resource/aksi | Anonim | Ketua Kelas | Guru Piket | Admin |
|---|---:|---:|---:|---:|
| Login / logout sendiri | Ya | Ya | Ya | Ya |
| Membaca profil sesi sendiri | Tidak | Ya | Ya | Ya |
| Membaca daftar siswa | Tidak | Kelas tugas | Semua kelas | Semua, termasuk nonaktif |
| Membuat/mengubah/nonaktifkan/menghapus siswa | Tidak | Tidak | Tidak | Ya |
| Membaca/mengelola data guru, kelas, dan akun | Tidak | Tidak | Tidak | Ya |
| Membuat/mengubah/menghapus presensi | Tidak | Kelas tugas | Semua kelas | Semua kelas |
| Membaca monitoring/riwayat/laporan | Tidak | Kelas tugas | Semua kelas | Semua kelas |
| Mencetak atau mengekspor laporan | Tidak | Kelas tugas | Semua kelas | Semua kelas |
| Membaca log aktivitas | Tidak | Tidak | Ya | Ya |
| Memulai reset password akun | Tidak | Tidak | Tidak | Ya |

## 3. Persyaratan fungsional

### Autentikasi dan sesi

- **FR-AUTH-01:** Sistem harus mengautentikasi identifier/password terhadap akun aktif di backend.
- **FR-AUTH-02:** Role dan kelas tugas harus berasal dari data server setelah autentikasi; client tidak dapat memilih atau menaikkan role.
- **FR-AUTH-03:** Sistem harus menyediakan pembacaan sesi saat ini dan logout yang membatalkan sesi server.
- **FR-AUTH-04:** Sesi kedaluwarsa/tidak valid harus menghasilkan respons autentikasi yang dapat dikenali frontend; UI mengarahkan pengguna untuk login tanpa menampilkan detail internal.
- **FR-AUTH-05:** Password tidak boleh dikembalikan pada respons API, log, atau profil sesi.
- **FR-AUTH-06:** Hanya Admin dapat memulai reset password akun. Backend menerapkan mekanisme sekali pakai/kanal aman yang disepakati; endpoint tidak mengembalikan password baru.

### Presensi

- **FR-ATT-01:** Sistem harus menyimpan paling banyak satu catatan per siswa, kelas, dan tanggal sekolah, kecuali kebutuhan koreksi historis disepakati berbeda.
- **FR-ATT-02:** Status yang diterima adalah `HADIR`, `TERLAMBAT`, `IZIN`, `SAKIT`, dan `ALPA`.
- **FR-ATT-03:** Catatan harus memuat tanggal, kelas, siswa (NIS dan ID stabil), status, waktu jika relevan, keterangan, pembuat/pengubah, dan waktu perubahan.
- **FR-ATT-04:** Ketua Kelas hanya boleh mengakses kelas tugas server-side. Kelas yang dikirim client harus tetap diverifikasi terhadap sesi.
- **FR-ATT-05:** Guru Piket dan Admin boleh melakukan operasi presensi pada semua kelas yang aktif.
- **FR-ATT-06:** Server harus menolak siswa yang tidak berada di kelas terkait atau tidak aktif untuk pencatatan baru.
- **FR-ATT-07:** Sistem harus menyediakan daftar presensi kelas/tanggal, simpan batch, koreksi satu catatan, dan penghapusan catatan presensi bagi role yang berwenang.
- **FR-ATT-08:** Penghapusan catatan presensi tidak boleh menghapus data siswa.
- **FR-ATT-09:** Simpan batch harus atomik: semua perubahan diterima, atau kegagalan harus dinyatakan dengan detail validasi yang aman dan tidak menghasilkan keadaan parsial yang tidak jelas.
- **FR-ATT-10:** Sistem harus mencatat audit untuk pembuatan, koreksi, dan penghapusan presensi.

### Data sekolah dan akun

- **FR-DATA-01:** Admin dapat membuat, membaca, dan mengubah siswa dengan NIS unik, nama, kelas, dan status.
- **FR-DATA-02:** Admin dapat membuat, membaca, dan mengubah guru dengan NIP unik, nama, dan status.
- **FR-DATA-03:** Admin dapat membuat, membaca, dan mengubah kelas serta menetapkan/melepas akun Ketua Kelas.
- **FR-DATA-04:** Admin dapat membuat/mengubah/menonaktifkan akun dan menentukan role serta penugasan kelas yang valid.
- **FR-DATA-05:** Backend harus memvalidasi keunikan identifier, keberadaan relasi, dan kompatibilitas role/kelas.
- **FR-DATA-06:** Nonaktifkan data mempertahankan keterkaitan historis dan mencegah operasi baru yang dilarang.
- **FR-DATA-07:** Penghapusan permanen hanya boleh dilakukan Admin dan backend harus mencegah pelanggaran referential integrity/retensi.
- **FR-DATA-08:** Ketua Kelas dan Guru Piket tidak boleh mengakses endpoint tulis data induk atau akun, walaupun UI tidak menampilkan tombol tersebut.

### Monitoring, riwayat, laporan, dan audit

- **FR-REPORT-01:** Sistem harus menghitung ringkasan monitoring per kelas berdasarkan siswa aktif dan presensi tersimpan untuk tanggal yang diminta.
- **FR-REPORT-02:** Sistem harus menyediakan riwayat berdasarkan kelas serta rentang tanggal yang valid dan berada dalam cakupan role.
- **FR-REPORT-03:** Sistem harus menyediakan rekap laporan per kelas/periode dengan filter status bila digunakan.
- **FR-REPORT-04:** Perhitungan “Hadir” mencakup Terlambat; nilai Terlambat adalah rincian, tidak dihitung dua kali pada total.
- **FR-REPORT-05:** Aturan hari efektif, libur, zona waktu, batas keterlambatan, dan perlakuan hari tanpa presensi harus dikonfigurasi/disepakati sekolah, bukan diasumsikan oleh client.
- **FR-AUDIT-01:** Backend harus mencatat aktor, aksi, tipe/ID objek, waktu server, hasil, dan request ID untuk operasi penting.
- **FR-AUDIT-02:** Log tidak boleh memuat password, token, cookie, sandi reset, atau rahasia.
- **FR-AUDIT-03:** Guru Piket dan Admin dapat membaca log sesuai cakupan kebijakan; Ketua Kelas tidak dapat membaca log global.
- **FR-AUDIT-04:** Pengguna aplikasi tidak dapat mengubah atau menghapus audit log.

### Frontend dan integrasi

- **FR-UI-01:** Semua halaman produksi harus menggunakan repository/data-access adapter; tidak ada operasi produksi yang diam-diam kembali ke data demo saat API gagal.
- **FR-UI-02:** UI hanya menyatakan perubahan berhasil sesudah konfirmasi server.
- **FR-UI-03:** UI menyediakan keadaan loading, kosong, gagal, konflik, berhasil, dan sesi habis dengan instruksi yang dapat dipahami pengguna.
- **FR-UI-04:** Kesalahan teknis dicatat untuk diagnosis tanpa menampilkan stack trace atau isi mentah server kepada pengguna.
- **FR-UI-05:** Laporan cetak/PDF dan Excel harus mengikuti data/filter yang diizinkan, serta menampilkan nama sekolah, jurusan, kelas, dan periode.
- **FR-UI-06:** Login produksi tidak menampilkan pilihan role demo.

## 4. Persyaratan data dan aturan validasi

- Semua entity menggunakan ID stabil yang ditetapkan server; NIS/NIP bukan pengganti ID relasi internal.
- NIS/NIP dinormalisasi dan unik dalam lingkup yang disepakati sekolah.
- Tanggal presensi dikirim sebagai tanggal kalender `YYYY-MM-DD`; timestamp audit menggunakan ISO 8601 dengan zona/offset yang eksplisit.
- ID kelas dan siswa di setiap mutasi diverifikasi oleh backend terhadap database, sesi, status aktif, dan relasi kelas.
- Pagination/search/filter tidak boleh melewati cakupan akses server.
- Respons invalid atau tidak lengkap tidak boleh ditafsirkan sebagai nilai default yang tampak sukses.
- Perubahan yang berdampak pada banyak record memakai transaksi.

## 5. Persyaratan nonfungsional

- **NFR-SEC-01:** Seluruh endpoint terlindungi harus memeriksa autentikasi dan otorisasi object-level setiap request.
- **NFR-SEC-02:** Produksi menggunakan HTTPS. Bila memakai cookie lintas origin, konfigurasi `HttpOnly`, `Secure`, `SameSite`, CORS, dan CSRF harus ditetapkan secara eksplisit.
- **NFR-SEC-03:** Password disimpan dengan password hashing yang sesuai praktik saat backend ditentukan; kredensial tidak masuk log.
- **NFR-SEC-04:** Server memvalidasi semua input, membatasi ukuran payload, dan menggunakan query parameter terikat/ORM yang aman.
- **NFR-PRIV-01:** Hanya data personal minimum yang diperlukan dikembalikan; akses dan ekspor dibatasi role/cakupan.
- **NFR-REL-01:** Kegagalan jaringan, timeout, validasi, konflik, dan kegagalan server tidak dilaporkan sebagai sukses.
- **NFR-REL-02:** Operasi batch menghindari keadaan parsial atau mengembalikan hasil per record yang terdokumentasi jika transaksi atomik tidak memungkinkan.
- **NFR-OBS-01:** Log operasional terstruktur memiliki request/correlation ID, tanpa menyertakan secret atau data sensitif yang tidak diperlukan.
- **NFR-MAINT-01:** Kontrak API, migrasi database, cara menjalankan lokal, konfigurasi environment, dan test dijaga di dokumentasi backend.
- **NFR-PERF-01:** Target latency, ukuran dataset, concurrency, availability, backup/restore, dan retensi harus diputuskan sebelum rilis; angka target belum ditentukan.
- **NFR-UX-01:** Bahasa UI menggunakan istilah sederhana, fokus keyboard dan label form jelas, serta tampilan responsif untuk mobile/desktop.

## 6. Kriteria penerimaan minimum

1. Request anonim ke route terlindungi ditolak; login tidak dapat menerima role pilihan dari client.
2. Ketua Kelas dapat menyimpan presensi kelas tugas, tetapi request langsung ke kelas lain ditolak dan tidak mengubah database.
3. Guru Piket dapat membuat/mengoreksi/menghapus presensi lintas kelas, tetapi request CRUD siswa/guru/kelas/akun ditolak.
4. Admin dapat mengelola data dan menonaktifkan siswa; siswa nonaktif tidak muncul sebagai sasaran presensi baru, sementara riwayat lama tetap dapat dibaca.
5. Hanya Admin dapat memulai reset password akun; respons dan audit tidak berisi password/token.
6. Dua permintaan membuat presensi yang sama mengikuti aturan unik/konflik yang disepakati dan menghasilkan respons yang jelas.
7. Gagal simpan tidak menampilkan status sukses dan data lama tidak hilang tanpa konfirmasi server.
8. Monitoring, riwayat, PDF/cetak, dan Excel memakai dataset, tanggal, kelas, role, dan definisi hitung yang sama.
9. Audit log memuat perubahan penting dan tidak dapat diubah melalui endpoint aplikasi.
10. Respons kesalahan tidak memperlihatkan stack trace, SQL, credential, atau detail internal.

## 7. Dependensi yang belum ditentukan

Lihat bagian “Keputusan yang masih perlu disepakati” di [PRD.md](./PRD.md) dan tabel pertanyaan teknis di [API-CONTRACT.md](./API-CONTRACT.md). Kriteria yang membutuhkan kebijakan sekolah tidak boleh dianggap final sebelum pemilik produk menyetujuinya.
