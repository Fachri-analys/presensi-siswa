# Checklist Perbaikan Kesiapan Produksi

## Tahap 1 — Lindungi Admin terakhir

- [x] Cegah demosi/deaktivasi/penghapusan Admin aktif terakhir.
- [x] Pindahkan pemeriksaan invariant ke dalam transaksi SQLite.
- [x] Tambahkan tes service dan E2E untuk Admin terakhir dan lebih dari satu Admin, termasuk penghapusan bersamaan.

## Tahap 2 — Kelas aktif untuk siswa

- [x] Tolak kelas nonaktif saat membuat/memindahkan siswa di backend.
- [x] Selaraskan pilihan kelas pada UI.
- [x] Tambahkan tes service dan E2E untuk kelas aktif/nonaktif.

## Checkpoint A

- [x] Tes unit/E2E terkait lulus; lint/typecheck lulus; alur role tidak regresi.

## Tahap 3 — Pagination di atas 100 siswa

- [x] Implementasikan pagination/pencarian server-side di UI siswa.
- [x] Gunakan total siswa dari API untuk hitungan halaman kelas.
- [x] Uji pagination API pada 105 siswa dan query status/page pada API client.

## Tahap 4 — Retensi dan lampiran

- [x] Tetapkan perilaku: penghapusan siswa permanen menghapus lampiran; arsip/nonaktif untuk masa retensi.
- [x] Selaraskan penghapusan metadata dengan file fisik dan catat kegagalan; transaksi gagal tidak menghapus file.
- [x] Tambahkan skrip audit file yatim/hilang yang hanya melaporkan dan tidak menghapus.
- [x] Uji alur penghapusan E2E dan skrip audit pada database/direktori sementara.

## Tahap 5 — Load test

- [x] Perbaiki host, HTTPS, autentikasi, validasi respons, ambang, dan exit code.
- [x] Uji skrip terhadap server HTTP lokal tiruan dengan concurrency rendah.
- [ ] Uji kapasitas aplikasi di staging dengan concurrency rendah sebelum dinaikkan.

## Checkpoint B

- [x] Pagination, retensi file, dan skrip load test sudah diverifikasi dengan data uji lokal.
- [ ] Ukur kapasitas aplikasi nyata di staging.

## Tahap 6 — Impor data

- [x] Pilih input manual melalui UI Admin yang ada; impor CSV tidak ditambahkan karena format dan kebutuhan jumlah data belum ditetapkan.
- [ ] Jika sekolah memerlukan impor massal, implementasikan preview, validasi, laporan kegagalan, serta tes batch sebelum onboarding.

## Tahap 7 — Hardening

- [x] Tambahkan CSP frontend dengan origin API dari konfigurasi build.
- [x] Tambahkan no-new-privileges dan hapus capabilities container API, web, migration, dan seed.
- [ ] Verifikasi runtime Compose/browser di server; tinjau resource limit, pin digest image, dependency audit, secret history, dan log.
- [ ] Pastikan CI tetap lulus dan tidak melemahkan quality gate.

## Tahap 8 — Staging, backup, dan restore

- [ ] Siapkan staging HTTPS, secret, volume SQLite/uploads, migrasi, dan Admin awal.
- [ ] Verifikasi restart/deploy dan persistensi SQLite.
- [ ] Atur backup terenkripsi offsite dan retensi.
- [ ] Pulihkan satu set backup ke staging; verifikasi integritas serta alur inti.
- [ ] Verifikasi monitoring disk, uptime, backup, dan prosedur rollback.

## Tahap 9 — Penutupan

- [x] Jalankan tes frontend/backend, migrasi SQLite, E2E, lint, typecheck, build, dan pemeriksaan skrip.
- [ ] Jalankan Docker Compose config/image runtime dan audit dependency terbaru pada CI atau host dengan akses registry/Docker.
- [ ] Smoke test role Admin, Guru Piket, Ketua Kelas, presensi, surat, rekap, PDF, dan reset password.
- [ ] Perbarui laporan audit dan panduan operasional dengan bukti terbaru.
- [ ] Tinjau diff/status Git dan putuskan READY atau NOT READY berdasarkan hasil.
