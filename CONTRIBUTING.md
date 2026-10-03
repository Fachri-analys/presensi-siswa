# Panduan Kontribusi

Terima kasih sudah membantu mengembangkan Sistem Presensi Siswa. Dokumen ini menjelaskan cara bekerja di repository dan cara menghindari ketidaksesuaian kebutuhan antara frontend dan backend.

## Sebelum mulai

1. Baca [README.md](./README.md) untuk status aplikasi dan cara menjalankannya.
2. Untuk pekerjaan backend, baca [PRD](./docs/PRD.md), [SRS](./docs/SRS.md), dan [Backend Handoff](./docs/BACKEND-HANDOFF.md).
3. [Kontrak API](./docs/API-CONTRACT.md) adalah draf. Jangan menganggap endpoint, field, atau format respons final sebelum disetujui bersama.
4. Jika keputusan produk/API berubah, perbarui dokumen terkait dalam pull request yang sama dengan perubahan implementasi.

## Alur perubahan

- Buat branch terpisah untuk setiap fitur/perbaikan; jangan bekerja langsung di branch default.
- Buat perubahan sekecil mungkin dan tetap dalam satu tujuan.
- Tambahkan atau perbarui test yang membuktikan perilaku yang diubah.
- Jangan memasukkan file `.env.local`, credential, password, token, dump database, data siswa asli, `node_modules`, atau hasil build.
- Jangan menampilkan stack trace, pesan mentah database, atau rahasia kepada pengguna.
- Gunakan pull request untuk perubahan bersama; jelaskan kebutuhan, perilaku, risiko, serta langkah pengujian.

## Validasi frontend saat ini

Jalankan dari root frontend:

```bash
npm ci
npm run lint
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm run build
```

Skrip test otomatis belum tersedia pada frontend. Jika perubahan menyentuh integrasi, tambahkan test yang relevan dan jelaskan skenario manual yang sudah diuji.

## Ketentuan backend

- Otorisasi role dan cakupan data wajib diterapkan dan diuji di server pada setiap request; menyembunyikan tombol di UI bukan kontrol akses.
- Jangan menerima role atau kepemilikan kelas dari input yang tidak dipercaya sebagai bukti otorisasi.
- Validasi relasi siswa-kelas, status aktif, batasan unik, serta perubahan bersamaan di backend.
- Gunakan transaksi untuk perubahan multi-record yang harus atomik.
- Audit perubahan penting di server; jangan menyimpan password, token, cookie, atau password reset di log.
- Reset password harus memakai alur aman dan tidak mengembalikan password plaintext.
- Dokumentasikan konfigurasi melalui nama environment variable dan contoh tanpa nilai rahasia.

## Gaya commit dan pull request

Gunakan pesan commit singkat berbentuk tindakan, misalnya:

- `docs: add backend requirements`
- `feat: add attendance API`
- `fix: enforce class access on attendance`

Pull request minimal menjelaskan:

1. Masalah atau kebutuhan yang ditangani.
2. Perubahan perilaku/API/skema dan kompatibilitasnya.
3. Validasi/test yang dijalankan.
4. Keputusan atau pertanyaan yang masih terbuka.
