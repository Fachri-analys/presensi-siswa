# Rencana Perbaikan Kesiapan Produksi Presensi Siswa

## Tujuan

Menutup temuan audit yang berdampak pada akses Admin, penempatan dan pengelolaan siswa, privasi lampiran, serta kesiapan operasi SQLite di server. Perbaikan dilakukan bertahap dengan perubahan sekecil mungkin, tanpa menyentuh data produksi. Status produksi baru dapat diputuskan setelah verifikasi pada staging/server.

## Keputusan dan batasan

- Tetap memakai Next.js, NestJS, Prisma, dan SQLite; SQLite dijalankan pada satu instance API dengan volume persisten.
- Tidak mengubah UI/API atau aturan bisnis di luar yang diperlukan untuk memperbaiki temuan.
- Tidak menjalankan tes destruktif terhadap database berisi data asli. Tes integrasi memakai database SQLite terisolasi.
- Penghapusan permanen siswa menghapus lampiran terkait setelah transaksi database berhasil; kegagalan penghapusan file dicatat. Runbook mensyaratkan siswa diarsip/nonaktif selama masa simpan bila sekolah wajib mempertahankan surat.
- Impor CSV siswa bersifat opsional. Jika jumlah data akan dimasukkan satu per satu, fitur itu tidak menghalangi rilis; jika jumlahnya besar, lakukan sebelum onboarding data asli.

## Urutan kerja

### Tahap 1 — Lindungi akses Admin

**Pekerjaan:** Tambahkan aturan agar perubahan role/status dan penghapusan akun tidak dapat menghilangkan Admin aktif terakhir. Pastikan validasi aman terhadap perubahan serentak.

**Kriteria selesai:**
- Sistem selalu mempertahankan setidaknya satu Admin aktif.
- Admin terakhir tidak dapat menonaktifkan, menghapus, atau menurunkan role akunnya sendiri maupun akun Admin terakhir lain.
- Operasi Admin biasa tetap berjalan.

**Verifikasi:** Tes unit/service dan E2E pada database uji untuk Admin tunggal, lebih dari satu Admin, demosi, deaktivasi, penghapusan, dan sesi.

### Tahap 2 — Validasi kelas aktif untuk data siswa

**Pekerjaan:** Periksa status kelas pada backend saat siswa dibuat atau dipindahkan. Selaraskan pilihan kelas di frontend agar kelas nonaktif tidak dipilih untuk siswa baru.

**Kriteria selesai:**
- API menolak pembuatan/pemindahan siswa ke kelas nonaktif.
- Kelas aktif tetap dapat dipilih dan perubahan status kelas tidak mengubah siswa historis secara tak sengaja.
- UI menampilkan pilihan yang konsisten dengan aturan API.

**Verifikasi:** Tes service/API untuk kelas aktif dan nonaktif, lalu cek alur tambah/edit siswa di browser.

### Checkpoint A — Integritas akun dan kelas

- [ ] Tes backend terkait lulus.
- [ ] Typecheck dan lint backend/frontend lulus.
- [ ] Alur Admin, Guru Piket, dan Ketua Kelas yang relevan tidak mengalami regresi.

### Tahap 3 — Hilangkan batas tampilan 100 siswa

**Pekerjaan:** Hubungkan pagination/pencarian UI ke pagination server-side yang tersedia; gunakan hitungan siswa aktif dari respons backend untuk halaman kelas, bukan menghitung dari halaman siswa yang sedang dimuat.

**Kriteria selesai:**
- Admin dapat mencari, memfilter, melihat, dan mengelola data di atas 100 siswa.
- Pagination mempertahankan filter/kata kunci saat berpindah halaman.
- Hitungan siswa per kelas sesuai hasil backend, termasuk pada data lebih dari 100 siswa.

**Verifikasi:** Tes API-client/UI dengan fixture lebih dari 100 siswa, uji pencarian lintas halaman, serta tes hitungan kelas.

### Tahap 4 — Tetapkan retensi dan kelola file surat sakit

**Pekerjaan:** Tetapkan perilaku retensi/penghapusan bersama aturan data sekolah. Setelah kebijakan ditetapkan, sinkronkan penghapusan metadata dan file dengan aman serta tambahkan cara mendeteksi file yatim.

**Kriteria selesai:**
- Penghapusan data tidak meninggalkan lampiran yatim tanpa pencatatan.
- File yang masih berada dalam masa retensi tidak terhapus tanpa sengaja.
- Backup dan restore mempertahankan hubungan database dengan lampiran.
- Kegagalan operasi file dapat dideteksi dan ditangani.

**Verifikasi:** Tes integrasi memakai direktori sementara dan database uji untuk hapus sukses/gagal, path di luar direktori upload, serta konsistensi backup/restore. Jangan jalankan cleanup pada data produksi selama tes.

### Tahap 5 — Perbaiki alat uji kapasitas

**Pekerjaan:** Perbaiki skrip load test supaya menggunakan host API yang benar (termasuk HTTPS), mengautentikasi endpoint terlindungi, memeriksa status/error, dan benar-benar gagal bila ambang yang disetel tidak tercapai.

**Kriteria selesai:**
- Skrip memberi laporan yang membedakan masalah koneksi, autentikasi, dan respons aplikasi.
- Ambang latency/error/throughput dapat dikonfigurasi dan menentukan exit code.
- Pengukuran tidak menimbun seluruh sampel tanpa batas.

**Verifikasi:** Uji skrip terhadap server lokal/staging dengan dataset uji dan concurrency rendah terlebih dulu; naikkan beban bertahap. Jangan jalankan beban tinggi ke production.

### Checkpoint B — Data dan lampiran

- [ ] Pagination serta filter terbukti bekerja pada lebih dari 100 siswa.
- [ ] Alur retensi lampiran teruji di database dan direktori sementara.
- [ ] Skrip kapasitas dapat mendeteksi kondisi gagal secara benar.

### Tahap 6 — Putuskan kebutuhan impor siswa massal

**Pekerjaan:** Jika data siswa akan dimasukkan dalam jumlah besar, sediakan impor CSV dengan pratinjau, validasi kolom/NIS/kelas, laporan baris gagal, serta commit batch yang aman. Jika jumlah kecil, dokumentasikan prosedur input manual dan lewati implementasi fitur.

**Kriteria selesai:**
- Tidak ada baris diterapkan diam-diam ketika validasi gagal.
- NIS duplikat, kelas tidak valid/nonaktif, karakter, dan file besar ditangani dengan pesan yang jelas.
- Pengguna dapat meninjau hasil sebelum data disimpan.

**Verifikasi:** Tes validasi dan integrasi menggunakan file CSV uji; pastikan kegagalan tidak meninggalkan batch parsial yang tidak dilaporkan.

### Tahap 7 — Hardening aplikasi dan dependency

**Pekerjaan:** Tinjau CSP frontend, header HTTPS, image/container, pembatasan resource, file environment, lockfile dan hasil audit dependency. Terapkan hanya penguatan yang kompatibel dengan aplikasi.

**Kriteria selesai:**
- CSP diuji pada semua halaman dan alur autentikasi tanpa memblokir aset/aplikasi.
- Container dan dependency memiliki konfigurasi yang dapat ditinjau serta dibangun ulang secara konsisten.
- Tidak ada secret production di repository atau log.

**Verifikasi:** Audit dependency pada CI, build image, pemeriksaan header, dan smoke test halaman/login. Catat temuan yang memerlukan keputusan, jangan menurunkan ambang CI.

### Tahap 8 — Uji operasi server, backup, dan pemulihan

**Pekerjaan:** Siapkan staging dengan domain/HTTPS, secret production khusus staging, volume SQLite/uploads persisten, migrasi, seed Admin, reverse proxy, dan prosedur backup. Uji deploy dan pemulihan staging dari satu set backup yang sama.

**Kriteria selesai:**
- API dan web hidup melalui HTTPS setelah deploy baru dan restart container.
- SQLite tetap tersedia setelah container dibuat ulang; hanya satu instance API menulis database.
- Backup database dan uploads dapat dipulihkan bersama; integritas database dan login/presensi/laporan/lampiran terverifikasi.
- Backup disalin ke lokasi terpisah dengan enkripsi dan retensi yang disetujui.
- Uptime, ruang disk, kegagalan backup, dan prosedur rollback memiliki pemilik.

**Verifikasi:** Jalankan smoke test pada staging untuk login tiap role, CRUD siswa/kelas, presensi, surat sakit, rekap, PDF, reset password, restart, dan restore. Tidak menguji restore pada production.

### Tahap 9 — Penutupan audit dan keputusan rilis

**Pekerjaan:** Jalankan seluruh pemeriksaan lokal/CI yang relevan, tinjau diff, perbarui laporan audit dan instruksi operasional, lalu evaluasi risiko tersisa.

**Kriteria selesai:**
- Tes frontend/backend, migrasi SQLite, E2E, lint, typecheck, build, Compose, dan audit dependency yang didukung lulus.
- Tes role mencakup skenario izin dan penolakan untuk Admin, Guru Piket, dan Ketua Kelas.
- Hasil staging backup-restore serta smoke test dicatat dengan bukti.
- Kesimpulan READY/NOT READY ditentukan dari hasil, bukan asumsi.

**Verifikasi:** Review checklist `tasks/todo.md`, `git diff --check`, status Git, dan laporan akhir.

## Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Aturan Admin terakhir mengunci pengelola karena kondisi akun lama | Tinggi | Tes skenario tunggal dan jamak; sediakan jalur pemulihan Admin yang hanya dapat dijalankan operator tepercaya. |
| Pembersihan file menghapus lampiran yang wajib disimpan | Tinggi | Setujui retensi sebelum implementasi; uji hanya pada direktori sementara. |
| SQLite digunakan dengan lebih dari satu API writer | Tinggi | Tetapkan satu replika API dan dokumentasikan batas skala; backup konsisten dan pantau disk. |
| Import besar menghasilkan data parsial/duplikat | Sedang | Preview, validasi lengkap, transaksi/batch terlapor, dan backup sebelum onboarding. |
| Staging tidak sama dengan server tujuan | Sedang | Samakan image/config/domain/proxy/volume dan jalankan checklist pascadeploy. |

## Keputusan yang belum diperlukan untuk mulai

- Kebutuhan impor CSV diputuskan berdasarkan jumlah data yang akan dimasukkan.
- Masa retensi surat sakit dan audit perlu ditetapkan sekolah sebelum perubahan penghapusan permanen.
- Jadwal, lokasi offsite, enkripsi, dan masa simpan backup perlu ditentukan operator sebelum server berisi data asli.

## Status

Rencana disusun; implementasi belum dimulai. Jalankan tahap sesuai urutan, verifikasi setiap checkpoint, dan hentikan rilis jika tes integritas/restore gagal.
