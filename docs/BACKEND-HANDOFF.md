# Backend Handoff

Status dokumen ini diperbarui 26 Oktober 2026. Aplikasi memiliki alur backend utama dan CI, tetapi status lulus CI saja belum membuktikan kesiapan produksi. Deployment, kredensial production, target ketersediaan, serta uji pemulihan tetap harus diverifikasi pada lingkungan sekolah.

## Stack dan alur utama

- Frontend: Next.js 16. Backend: NestJS 11, Prisma 5, dan PostgreSQL 16.
- Autentikasi memakai sesi cookie; permintaan yang mengubah data diperiksa terhadap Origin frontend yang diizinkan.
- Ketua Kelas dibatasi ke kelasnya, tanggal hari ini, dan jadwal presensi. Semua pemeriksaan tetap dilakukan di backend.
- Simpan batch presensi dan unggah surat sakit memperbarui data terkait dalam transaksi database. Berkas surat dapat diunduh lewat endpoint berotorisasi.
- Daftar siswa dibatasi maksimal 100 baris per halaman. Riwayat dan rekap presensi dibatasi maksimal 366 hari.
- Hari efektif diatur dengan `SCHOOL_WORKING_DAYS` dan `SCHOOL_HOLIDAYS`. Nilai default adalah Senin–Jumat tanpa hari libur tambahan.
- Audit log mencatat operasi tulis pada akun, siswa, guru, kelas, dan surat; isi password maupun token tidak dicatat.

## Pemeriksaan sebelum produksi

- [ ] Tetapkan domain frontend/API, HTTPS, `CORS_ORIGINS`, `SESSION_SAME_SITE`, serta secret production.
- [ ] Isi kalender sekolah melalui `SCHOOL_WORKING_DAYS` dan `SCHOOL_HOLIDAYS`; pastikan hari libur sekolah tahun berjalan masuk.
- [ ] Jalankan migrasi pada database yang benar dan verifikasi backup database serta volume unggahan dapat dipulihkan ke staging.
- [ ] Uji alur login dan seluruh peran pada domain deployment, termasuk blokir Origin yang tidak dikenal.
- [ ] Tetapkan target beban, retensi surat, pemantauan, dan prosedur insiden.
- [ ] Jalankan workflow CI pada commit kandidat rilis. Workflow saat ini memvalidasi dan membangun image; workflow ini tidak melakukan deployment otomatis.

Lihat [README utama](../README.md) dan [README backend](../backend/README.md) untuk langkah menjalankan aplikasi, backup, dan pemulihan.
