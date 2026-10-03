# Dokumentasi Proyek

Dokumen ini adalah titik awal untuk memahami kebutuhan produk dan memulai pekerjaan backend.

| Dokumen | Tujuan |
|---|---|
| [PRD.md](./PRD.md) | Tujuan produk, pengguna, ruang lingkup, alur utama, dan aturan bisnis. |
| [SRS.md](./SRS.md) | Persyaratan sistem fungsional/nonfungsional dan kriteria penerimaan. |
| [API-CONTRACT.md](./API-CONTRACT.md) | Usulan resource, endpoint, payload, respons, error, dan autentikasi API. |
| [BACKEND-HANDOFF.md](./BACKEND-HANDOFF.md) | Panduan kerja bersama, pembagian tanggung jawab, keputusan yang sudah ditetapkan, dan checklist integrasi. |

Panduan kontribusi repository ada di [../CONTRIBUTING.md](../CONTRIBUTING.md).

## Status dokumen dan implementasi

- Dokumen ini merangkum kebutuhan yang telah disampaikan pemilik produk dan kondisi frontend saat ini.
- Kontrak endpoint adalah **usulan untuk disepakati bersama** sebelum implementasi, bukan API yang sudah tersedia.
- Frontend masih memakai data demo. Fondasi `lib/data/contracts.ts`, `lib/data/api-client.ts`, dan `lib/data/decoders.ts` belum dipakai oleh halaman.
- Perubahan kebutuhan yang disepakati harus diperbarui di dokumen terkait dan dicatat pada bagian keputusan di PRD atau handoff.
- Backend tidak boleh menganggap pembatasan UI sebagai kontrol akses; semua otorisasi dilakukan server.

## Urutan mulai yang disarankan

1. Baca PRD dan sepakati aturan produk yang belum ditentukan.
2. Baca SRS dan setujui kriteria penerimaan untuk MVP.
3. Finalkan API contract, skema data, metode autentikasi, dan kebijakan tanggal.
4. Implementasikan backend beserta migrasi, validasi, otorisasi server, audit log, dan test.
5. Sediakan environment uji serta dokumentasi cara menjalankan backend.
6. Integrasikan frontend melalui repository adapter, lalu jalankan skenario penerimaan end-to-end.
