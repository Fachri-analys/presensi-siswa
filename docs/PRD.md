# Product Requirements Document (PRD)

- **Produk:** Sistem Presensi Siswa — SMK Negeri 11 Jakarta
- **Status:** Draf kebutuhan produk untuk MVP backend
- **Tanggal:** 3 Oktober 2026
- **Pemilik produk:** Pemilik proyek (nama belum dicatat)
- **Pembaca:** Pengembang backend dan frontend, QA, serta pihak sekolah

## 1. Ringkasan

Sistem Presensi Siswa membantu sekolah mencatat kehadiran murid per kelas, memantau status presensi, melihat riwayat, menghasilkan laporan, dan mengelola data induk sekolah. Antarmuka frontend saat ini merupakan prototipe demo. Backend yang akan dibuat harus menjadi sumber kebenaran untuk identitas, otorisasi, data sekolah, presensi, dan audit.

Sistem mempunyai tiga role: Ketua Kelas, Guru Piket, dan Admin. Ketua Kelas bertugas mencatat presensi hanya untuk kelas yang ditugaskan. Guru Piket mengelola presensi lintas kelas. Admin mempunyai kewenangan tertinggi atas data sekolah dan akun.

## 2. Masalah dan peluang

- Pencatatan perlu terpusat agar data presensi tidak bergantung pada satu browser atau perangkat.
- Pengguna perlu melihat riwayat dan membuat laporan yang jelas, konsisten, dan layak dicetak.
- Hak akses harus sesuai tanggung jawab; akses kelas dan perubahan data harus dapat dipertanggungjawabkan.
- Sekolah perlu mengelola data siswa, guru, kelas, dan akun tanpa memberikan kewenangan pengelolaan akun kepada petugas presensi.

## 3. Tujuan

1. Mencatat dan mengoreksi presensi siswa berdasarkan kelas dan tanggal.
2. Membatasi Ketua Kelas ke kelas tugasnya dan membatasi Guru Piket pada operasi presensi.
3. Memberikan Admin kendali penuh atas data induk dan akun.
4. Menyediakan monitoring, riwayat, log aktivitas, dan ekspor laporan yang konsisten dengan data backend.
5. Menyediakan antarmuka yang mudah dipahami orang awam serta tidak membocorkan detail teknis saat terjadi kegagalan.
6. Menyiapkan integrasi yang jelas antara backend dan frontend melalui kontrak API yang disepakati.

## 4. Bukan tujuan MVP

- Mengganti sistem akademik/sekolah atau menjadi sumber nilai dan rapor.
- Aplikasi mobile native atau mode offline dengan sinkronisasi konflik.
- Integrasi otomatis dengan sistem eksternal (Dapodik, SSO sekolah, pesan/SMS/WhatsApp) sebelum kebutuhannya disepakati.
- Menetapkan framework backend, vendor hosting, atau teknologi database sebelum tim menyepakatinya.
- Menggunakan data demo atau pilihan role di browser sebagai identitas pengguna produksi.

## 5. Pengguna dan kebutuhan

### Ketua Kelas

Perlu melihat daftar siswa dan status presensi pada kelas tugasnya, mengisi/mengoreksi/menghapus catatan presensi, melihat riwayat kelas, serta mencetak atau mengekspor laporan kelas. Tidak boleh mengelola siswa, guru, kelas, maupun akun.

### Guru Piket

Perlu melihat seluruh kelas, mengisi/mengoreksi/menghapus presensi lintas kelas, memantau status hari berjalan, melihat riwayat dan log aktivitas, serta membuat laporan lintas kelas. Tidak boleh melakukan CRUD data siswa/guru/kelas/akun dan tidak memulai reset password akun.

### Admin

Perlu memantau seluruh data, melakukan semua operasi presensi sesuai kebijakan, mengelola siswa/guru/kelas/akun, mengaktifkan atau menonaktifkan data, menetapkan Ketua Kelas, meminta reset password akun melalui alur aman, dan melihat log aktivitas.

## 6. Ruang lingkup fitur MVP

- Login, pemeliharaan sesi, dan logout berbasis server.
- Dashboard menyesuaikan identitas, role, dan cakupan akses.
- Presensi harian per kelas: Hadir, Terlambat, Izin, Sakit, Alpa, atau belum diisi.
- Pencarian siswa dalam daftar, pemilihan kelas/tanggal sesuai role, serta koreksi/penghapusan catatan presensi.
- Daftar siswa; pengelolaan (buat, ubah, nonaktifkan, dan sesuai kebijakan hapus) hanya Admin.
- Pengelolaan guru, kelas, penugasan Ketua Kelas, dan akun hanya Admin.
- Monitoring lintas kelas untuk Guru Piket dan Admin; Ketua Kelas hanya kelas tugas.
- Riwayat/filter periode, rekap laporan, cetak ke PDF melalui dialog browser, dan ekspor Excel.
- Log aktivitas yang ditulis server dan hanya dapat dibaca oleh role yang diizinkan.
- Reset password yang dimulai Admin, tanpa menampilkan atau mengirim password plaintext kepada Admin.
- Pesan status memuat, kosong, berhasil, gagal, konflik, dan sesi kedaluwarsa yang mudah dimengerti.

## 7. Aturan produk yang sudah ditetapkan

1. Role hanya `KETUA_KELAS`, `GURU_PIKET`, dan `ADMIN`; role produksi ditentukan dari sesi terverifikasi di server.
2. Setiap akun Ketua Kelas ditugaskan ke kelas yang menjadi cakupannya. Penetapan dan perubahan penugasan hanya Admin.
3. Ketua Kelas dapat CRUD **presensi** di kelas tugas, bukan CRUD data siswa atau akun.
4. Guru Piket dapat CRUD **presensi** di semua kelas, tetapi tidak CRUD siswa/guru/kelas/akun.
5. Admin adalah role dengan hak tertinggi dan dapat mengelola data induk/akun.
6. Hanya Admin yang boleh memulai reset password akun. Reset mengikuti alur aman yang disediakan backend dan tidak mengembalikan password plaintext.
7. Hanya Admin yang boleh menghapus data siswa/guru/kelas/akun secara permanen, dengan pemeriksaan keterkaitan dan kebijakan retensi. Nonaktifkan data jika penghapusan akan merusak riwayat.
8. Siswa/guru nonaktif tidak dipilih untuk transaksi baru, tetapi catatan historis dipertahankan.
9. Semua endpoint terlindungi memeriksa identitas, status akun, role, dan cakupan objek pada server.
10. Kesalahan teknis mentah, stack trace, query, credential, dan data rahasia tidak ditampilkan di UI.
11. Jumlah “Hadir” mencakup “Terlambat”; nilai Terlambat ditampilkan sebagai rincian dan tidak dijumlahkan lagi sebagai kategori terpisah.
12. Log audit untuk perubahan penting ditulis server-side dan tidak dapat diubah oleh pengguna aplikasi.

## 8. Alur pengguna utama

### Mengisi presensi

1. Pengguna login; backend mengembalikan sesi/profil terverifikasi.
2. Frontend memuat kelas yang boleh diakses pengguna.
3. Ketua Kelas diarahkan/dikunci ke kelas tugas; Guru Piket/Admin dapat memilih kelas.
4. Pengguna memilih tanggal dan mengisi status siswa aktif.
5. Frontend mengirim perubahan; backend memvalidasi kelas, siswa, status, izin, dan duplikasi.
6. UI menyatakan berhasil hanya setelah server mengonfirmasi. Backend menulis audit perubahan.

### Admin mengelola data

1. Admin membuka data siswa, guru, kelas, atau akun.
2. Admin membuat/mengubah atau mengaktifkan/menonaktifkan data sesuai validasi.
3. Backend menjaga keunikan NIS/NIP dan konsistensi relasi kelas/akun.
4. UI menampilkan hasil dan log server mencatat aktor, aksi, objek, waktu, dan hasil.

### Membuat laporan

1. Pengguna memilih kelas/cakupan dan rentang tanggal yang diizinkan.
2. Backend menghitung rekap berdasarkan kalender dan data presensi resmi.
3. Frontend menampilkan pratinjau dan memungkinkan cetak/PDF atau ekspor Excel.
4. Isi ekspor harus sama dengan filter dan data yang ditampilkan, serta menampilkan nama sekolah, jurusan, dan kelas.

## 9. Ukuran keberhasilan

Kriteria rilis MVP yang dapat diuji:

- Seluruh operasi lintas role yang tidak diizinkan ditolak server, termasuk akses langsung ke endpoint dan manipulasi ID kelas.
- Tidak ada keberhasilan palsu pada UI ketika simpan/gagal jaringan ditolak.
- Presensi, riwayat, monitoring, laporan, dan ekspor merefleksikan sumber data backend yang sama.
- Perubahan penting menghasilkan audit log dengan aktor dan objek yang dapat ditelusuri.
- QA menyelesaikan semua skenario penerimaan pada [SRS.md](./SRS.md) tanpa defect severity blocker/critical yang diketahui.
- Target kapasitas, ketersediaan, waktu respons, pemulihan backup, dan retensi data ditetapkan bersama sekolah sebelum produksi.

## 10. Ketergantungan dan risiko

- Kontrak endpoint dan format respons perlu disepakati sebelum adapter frontend dibuat.
- Kalender hari belajar, hari libur, zona waktu sekolah, keterlambatan, dan periode laporan memengaruhi hasil statistik.
- Kebijakan retensi dan penghapusan dapat memengaruhi relasi presensi historis.
- Strategi cookie, domain deployment, HTTPS, CSRF, dan CORS harus cocok dengan deployment frontend.
- Akun awal Admin, proses onboarding, dan kanal reset password perlu ditentukan dan tidak boleh bergantung pada password demo.

## 11. Keputusan yang masih perlu disepakati

- Teknologi backend/database, hosting, dan strategi migrasi.
- Format username/login (email, NIS/NIP, atau identifier lain) dan akun mana yang dimiliki setiap orang.
- Kalender sekolah, zona waktu resmi (usulan awal `Asia/Jakarta`), cut-off keterlambatan, dan aturan hari efektif.
- Apakah presensi dapat diubah setelah tanggal berakhir, siapa yang dapat mengoreksi, dan apakah perlu approval.
- Kebijakan penghapusan permanen, retensi audit, dan ekspor data.
- Target kapasitas, SLA, backup/restore, pemantauan, dan prosedur incident response.
- Bentuk akhir envelope API, pagination, request ID, idempotensi, dan kode error.
