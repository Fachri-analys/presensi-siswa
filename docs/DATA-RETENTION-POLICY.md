# Kebijakan Retensi Data

## Masa simpan yang ditetapkan

Masa simpan yang disampaikan pemilik project adalah **6 bulan** untuk semua kategori berikut:

| Data | Awal penghitungan | Batas simpan |
|---|---|---:|
| Data induk siswa yang sudah tidak aktif/lulus | Tanggal status siswa ditandai nonaktif | 6 bulan |
| Presensi | Tanggal presensi | 6 bulan |
| Surat sakit/izin dan lampirannya | Tanggal surat | 6 bulan |
| Log audit | Waktu pembuatan log | 6 bulan |
| Backup database dan lampiran | Waktu snapshot dibuat | 6 bulan |

## Cara penerapan

- Kebijakan ini menetapkan jadwal retensi; audit ini tidak menghapus atau mengubah data yang sudah tersimpan.
- Penghapusan perlu dijalankan terpisah setelah operator meninjau daftar kandidat, memastikan tidak ada kewajiban sekolah yang mewajibkan masa simpan lebih panjang, dan memastikan backup terakhir berhasil.
- Hasil laporan, presensi, dan lampiran setelah 6 bulan dapat tidak lagi tersedia. Pastikan masa tersebut sesuai kebutuhan sekolah sebelum mengaktifkan penghapusan otomatis.
- Backup yang disimpan pada layanan lain harus memakai batas 6 bulan yang sama, kecuali sekolah menetapkan pengecualian tertulis.

## Kesenjangan implementasi

Schema saat ini menyimpan `Student.status` dan `Student.updatedAt`, tetapi tidak memiliki tanggal kelulusan atau tanggal status nonaktif yang terpisah. `updatedAt` dapat berubah saat data siswa diedit, sehingga belum aman untuk menghitung enam bulan sejak siswa dinonaktifkan. Karena itu, penghapusan otomatis data siswa belum boleh dijalankan. Tambahkan penanda tanggal nonaktif/kelulusan dan lakukan dry-run serta tinjauan daftar kandidat sebelum membuat job penghapusan.

Skrip backup saat ini membuat backup, tetapi belum melakukan retensi otomatis. Operator perlu meninjau daftar backup yang melewati enam bulan dan menghapusnya sesuai kebijakan penyimpanan sekolah; skrip backup tidak menghapus file lama.
