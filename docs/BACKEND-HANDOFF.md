# Backend Handoff

Dokumen ringkas untuk memulai kerja antara pemilik frontend dan pengembang backend.

## Apa yang tersedia sekarang

- Frontend demo Sistem Presensi Siswa berbasis Next.js.
- Acuan produk dan requirement pada [PRD.md](./PRD.md) dan [SRS.md](./SRS.md).
- Draf integrasi endpoint pada [API-CONTRACT.md](./API-CONTRACT.md).
- Fondasi TypeScript untuk port repository, HTTP JSON client, dan runtime decoder di `lib/data/`.
- **Belum tersedia:** backend, database, migrasi, autentikasi nyata, implementasi repository, serta penghubung halaman ke API.

Mengisi `.env.local` dengan URL API saja tidak mengubah frontend dari demo menjadi aplikasi backend. Jangan gunakan data demo sebagai data sekolah/produksi.

## Pembagian kerja yang disarankan

### Pengembang backend

- Usulkan teknologi dan arsitektur, lalu sepakati dengan pemilik produk.
- Finalkan skema data, migrasi, seed akun awal Admin, dan aturan integritas.
- Implementasikan sesi login/logout, endpoint produk, validasi, otorisasi server, audit log, dan reset password aman.
- Terapkan kebijakan per role/per objek pada semua route, termasuk pemeriksaan ID kelas/siswa.
- Sediakan test unit/integrasi untuk role, cakupan, validasi, transaksi, dan kasus gagal.
- Dokumentasikan setup lokal, environment, endpoint final/OpenAPI, migrasi, seed, test, deployment, backup/restore, dan prosedur operasional.
- Sediakan environment API uji dan akun uji per role tanpa memasukkan credential ke repository.

### Pemilik/frontend

- Meninjau dan menyetujui perilaku produk yang masih terbuka.
- Menyepakati API contract, payload, respons, error, sesi, dan kebijakan tanggal bersama backend.
- Membuat adapter repository yang mengimplementasikan kontrak TypeScript final.
- Mengganti pembacaan/penulisan demo halaman secara bertahap dan menghapus fallback demo untuk mode produksi.
- Menambahkan status loading/kosong/error/konflik/sukses dan pengujian integrasi UI.
- Menguji ekspor laporan serta semua alur pada akun dan data dari backend uji.

## Urutan kerja

1. Sepakati [PRD.md](./PRD.md), terutama role, data yang dihapus/nonaktif, reset password, dan ruang lingkup MVP.
2. Jawab pertanyaan terbuka di [SRS.md](./SRS.md) dan [API-CONTRACT.md](./API-CONTRACT.md).
3. Backend menerbitkan kontrak final (disarankan OpenAPI) dan contoh request/response/error.
4. Backend mengimplementasikan migrasi, autentikasi, otorisasi, fitur prioritas, audit, serta test.
5. Frontend mengimplementasikan adapter berdasarkan kontrak yang sudah final, bukan menebak respons.
6. Uji end-to-end lintas role, termasuk permintaan langsung yang melanggar hak akses.
7. Sebelum produksi, sepakati monitoring, backup/restore, retensi, support, dan deployment.

## Keputusan produk tercatat

- Ketua Kelas hanya mengelola presensi di kelas tugasnya; tidak mengelola user/data induk.
- Guru Piket mengelola presensi semua kelas; tidak mengelola user/data induk.
- Admin memiliki akses tertinggi dan satu-satunya role yang mengelola user/data induk serta memulai reset password akun.
- Hanya Admin yang dapat meminta penghapusan permanen; nonaktif lebih disukai jika dibutuhkan untuk menjaga riwayat.
- Reset password tidak boleh menampilkan/mengirim password plaintext.
- Error teknis mentah tidak ditampilkan kepada pengguna.
- Semua hak akses harus ditegakkan server-side, bukan hanya dengan menyembunyikan menu/tombol.

## Checklist sebelum frontend mulai integrasi

- [ ] Kontrak final memiliki definisi JSON request/response untuk setiap operasi yang digunakan UI.
- [ ] Status HTTP, kode error, request ID, pagination, field errors, dan response 204 disepakati.
- [ ] Autentikasi cookie/session, logout, CSRF, CORS, timeout, dan sesi kedaluwarsa diuji.
- [ ] Zona waktu sekolah, kalender hari efektif, libur, keterlambatan, dan tanggal laporan diputuskan.
- [ ] Hak akses diuji server-side dengan akun semua role dan percobaan akses objek di luar cakupan.
- [ ] Reset password, pembuatan Admin pertama, nonaktif, penghapusan, dan retensi audit diputuskan.
- [ ] Lingkungan pengembangan dan uji tersedia; tidak ada credential/secret di Git atau frontend bundle.
- [ ] Dokumen API dan cara menjalankan backend dapat diakses tim frontend.
