# Usulan Kontrak API

- **Status:** Draf untuk disepakati backend dan frontend
- **Produk:** Sistem Presensi Siswa — SMK Negeri 11 Jakarta
- **Versi usulan:** `v1`

Dokumen ini membantu memulai diskusi integrasi. Ini **bukan** spesifikasi server final. Perubahan dari usulan harus disepakati dan dicatat di sini sebelum adapter frontend dianggap stabil.

## 1. Prinsip kontrak

- Base URL dikonfigurasi melalui `NEXT_PUBLIC_API_BASE_URL`, misalnya `https://api.example.sch.id/api/v1/`. Jangan masukkan secret di URL/environment publik.
- Gunakan HTTPS selain localhost.
- ID entity adalah string stabil yang diterbitkan server.
- Usulan waktu: tanggal presensi sebagai `YYYY-MM-DD`; timestamp audit sebagai ISO 8601 dengan zona/offset eksplisit. Zona waktu sekolah perlu disahkan.
- Usulan request/response JSON UTF-8.
- Fondasi frontend saat ini menerima objek JSON langsung dan decoder per endpoint. Bila tim memilih envelope seperti `{ "data": ... }`, adapter/decoder harus secara eksplisit membuka envelope; jangan membuat asumsi diam-diam.
- `204 No Content` hanya untuk operasi tanpa nilai kembalian. Operasi lain mengembalikan JSON sesuai skema.
- Semua endpoint data membatasi akses berdasarkan sesi server; filter dari client bukan otorisasi.

## 2. Autentikasi dan error

### Sesi cookie

Usulan memakai cookie sesi `HttpOnly`, `Secure` di produksi, dan `SameSite` yang sesuai deployment. Frontend sudah mengirim `credentials: "include"`. Backend/frontend harus menyepakati origin, CORS, CSRF, durasi idle/absolut sesi, rotasi sesi, serta perilaku logout.

Jangan menyimpan token akses rahasia ke `localStorage`. Password hanya dikirim melalui koneksi TLS pada login dan tidak pernah dikembalikan.

### Format error usulan

Status HTTP adalah sumber kategori utama. Body boleh mengikuti format berikut, tetapi frontend tidak menampilkan `message` mentah:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Input tidak valid",
  "requestId": "req_01J...",
  "fieldErrors": {
    "nis": "NIS sudah digunakan"
  }
}
```

| HTTP | `code` usulan | Arti |
|---:|---|---|
| 400 | `BAD_REQUEST` | Bentuk request tidak valid |
| 401 | `UNAUTHENTICATED` | Belum login/sesi berakhir |
| 403 | `FORBIDDEN` | Role atau cakupan objek tidak diizinkan |
| 404 | `NOT_FOUND` | Objek tidak ditemukan atau sengaja disamarkan |
| 409 | `CONFLICT` | Duplikasi atau konflik perubahan |
| 422 | `VALIDATION_ERROR` | Field tidak lolos validasi |
| 429 | `RATE_LIMITED` | Batas permintaan tercapai |
| 5xx | `SERVER_ERROR` | Kesalahan server; sertakan `requestId` |

Jangan kirim stack trace, SQL, path internal, hash/password, cookie/token, atau detail secret dalam respons. Tetapkan `X-Request-Id` atau padanan yang konsisten. Fondasi client saat ini membaca `x-request-id` untuk pesan server umum.

## 3. Endpoint usulan

Semua nama route dan metode masih perlu disetujui. Route di bawah memakai prefix `/api/v1`.

### Sesi

| Method | Path | Kegunaan | Sukses |
|---|---|---|---|
| `POST` | `/auth/login` | Verifikasi identifier/password, buat sesi | `200` + profil sesi; set cookie |
| `GET` | `/auth/me` | Baca sesi saat ini | `200` + profil sesi |
| `POST` | `/auth/logout` | Batalkan sesi server dan bersihkan cookie | `204` |

Contoh body login:

```json
{ "identifier": "admin@sekolah.sch.id", "password": "REDACTED" }
```

Contoh profil sesi:

```json
{
  "id": "usr_123",
  "nama": "Nama Pengguna",
  "email": "user@sekolah.sch.id",
  "role": "GURU_PIKET",
  "kelasId": null
}
```

Jangan menerima `role` dari body login. Jika seorang pengguna dapat mengelola beberapa kelas, kontrak profil/cakupan perlu diperluas dengan keputusan eksplisit.

### Kelas dan monitoring

| Method | Path | Kegunaan |
|---|---|---|
| `GET` | `/classes` | Daftar kelas sesuai sesi; Admin dapat meminta status nonaktif |
| `POST` | `/classes` | Admin membuat kelas |
| `GET` | `/classes/{classId}` | Baca kelas sesuai cakupan role |
| `PATCH` | `/classes/{classId}` | Admin mengubah kelas |
| `DELETE` | `/classes/{classId}` | Admin meminta penghapusan; server memeriksa referensi/retensi |
| `PUT` | `/classes/{classId}/leader` | Admin menetapkan/melepas Ketua Kelas |
| `GET` | `/monitoring?date=YYYY-MM-DD` | Ringkasan kelas dalam cakupan |
| `GET` | `/monitoring/classes/{classId}?date=YYYY-MM-DD` | Detail monitoring kelas dalam cakupan |

Contoh body kelas:

```json
{ "nama": "XI TKJ 1", "jurusan": "Teknik Komputer dan Jaringan" }
```

Contoh penetapan Ketua Kelas:

```json
{ "accountId": "usr_456" }
```

Gunakan `accountId: null` untuk melepas penugasan jika disetujui. Server memeriksa role account, kelas, status aktif, dan aturan satu akun/satu kelas.

### Siswa dan guru

| Method | Path | Kegunaan |
|---|---|---|
| `GET` | `/students?kelasId=&search=&status=&cursor=&limit=` | Daftar siswa; scope disaring di server |
| `POST` | `/students` | Admin menambah siswa |
| `GET` | `/students/{studentId}` | Baca siswa sesuai role/cakupan |
| `PATCH` | `/students/{studentId}` | Admin mengubah siswa |
| `POST` | `/students/{studentId}/deactivate` | Admin menonaktifkan |
| `POST` | `/students/{studentId}/activate` | Admin mengaktifkan kembali |
| `DELETE` | `/students/{studentId}` | Admin meminta penghapusan permanen sesuai kebijakan |
| `GET` | `/teachers?search=&status=&cursor=&limit=` | Admin membaca guru |
| `POST` | `/teachers` | Admin menambah guru |
| `PATCH` | `/teachers/{teacherId}` | Admin mengubah guru |
| `POST` | `/teachers/{teacherId}/deactivate` | Admin menonaktifkan |
| `POST` | `/teachers/{teacherId}/activate` | Admin mengaktifkan kembali |
| `DELETE` | `/teachers/{teacherId}` | Admin meminta penghapusan permanen sesuai kebijakan |

Contoh:

```json
{ "nis": "12345678", "nama": "Nama Siswa", "kelasId": "cls_123" }
```

```json
{ "nip": "198001012006041001", "nama": "Nama Guru" }
```

NIS/NIP tidak boleh berubah menjadi ID otorisasi. Server harus memvalidasi keunikan, normalisasi, dan relasi kelas.

### Akun dan reset password

| Method | Path | Kegunaan |
|---|---|---|
| `GET` | `/users?search=&role=&status=&cursor=&limit=` | Admin membaca akun |
| `POST` | `/users` | Admin membuat akun |
| `PATCH` | `/users/{userId}` | Admin mengubah profil/role/cakupan yang diizinkan |
| `POST` | `/users/{userId}/deactivate` | Admin menonaktifkan akun |
| `POST` | `/users/{userId}/activate` | Admin mengaktifkan akun |
| `DELETE` | `/users/{userId}` | Admin meminta penghapusan sesuai kebijakan |
| `POST` | `/users/{userId}/password-reset` | Admin memulai alur reset aman |

Reset mengembalikan status permintaan saja, contohnya `{ "accepted": true }`; tidak mengembalikan password/token reset yang dapat digunakan. Pengiriman tautan/token harus menggunakan kanal aman yang disepakati sekolah.

Data pembuatan akun dan kaitannya dengan entitas Guru/Siswa perlu diputuskan. Jangan otomatis membuat akun siswa per orang tanpa persetujuan produk; kebutuhan saat ini menyebut Ketua Kelas sebagai akun petugas kelas.

### Presensi

| Method | Path | Kegunaan |
|---|---|---|
| `GET` | `/attendance?kelasId=&date=YYYY-MM-DD` | Baca presensi kelas/tanggal |
| `PUT` | `/attendance/classes/{classId}/dates/{date}` | Simpan batch presensi kelas/tanggal |
| `PATCH` | `/attendance/{attendanceId}` | Koreksi satu catatan |
| `DELETE` | `/attendance/{attendanceId}` | Hapus catatan presensi (bukan siswa) |

Contoh batch:

```json
{
  "records": [
    { "nis": "12345678", "status": "HADIR", "waktu": "07:02:00", "keterangan": "" },
    { "nis": "23456789", "status": "IZIN", "waktu": null, "keterangan": "Izin keluarga" }
  ]
}
```

Tanggal dan kelas berada pada path agar server memvalidasinya sebagai scope batch. Backend menentukan pembuat/pengubah dari sesi, bukan dari body. Satu record per kombinasi tanggal/kelas/siswa. PUT harus punya semantik idempotensi yang disepakati dan aturan apakah record yang tidak dikirim dibiarkan atau dihapus.

### Riwayat, laporan, dan audit

| Method | Path | Kegunaan |
|---|---|---|
| `GET` | `/attendance/history?kelasId=&from=&to=` | Ringkasan harian dalam cakupan |
| `GET` | `/reports/attendance?kelasId=&from=&to=&status=` | Rekap laporan |
| `GET` | `/audit-logs?cursor=&limit=&from=&to=&actorId=` | Membaca audit bagi Guru Piket/Admin sesuai kebijakan |

PDF/cetak dan workbook Excel saat ini dapat dibuat frontend dari data laporan yang telah diterima. Jika data terlalu besar atau kebijakan mengharuskan ekspor server-side, tentukan endpoint unduhan, format, batas ukuran, dan audit akses ekspor sebelum implementasi.

## 4. Bentuk data utama usulan

- **SessionUser:** `id`, `nama`, `email`, `role`, `kelasId` (nullable).
- **SchoolClass:** `id`, `nama`, `jurusan`, `ketuaAkunId` (nullable), `active`.
- **SchoolStudent:** `id`, `nis`, `nama`, `kelasId`, `status` (`active|inactive`).
- **SchoolTeacher:** `id`, `nip`, `nama`, `status` (`active|inactive`).
- **SchoolAccount:** `id`, `nama`, `email`, `role`, `kelasId` (nullable), `active`.
- **AttendanceRecord:** `id`, `date`, `kelasId`, `nis` atau `studentId`, `status`, `waktu`, `keterangan`, `createdBy`, `updatedBy`, `updatedAt`.
- **Audit entry:** ID, aktor, tindakan, tipe dan ID objek, timestamp server, hasil, request ID, metadata aman.

Kontrak frontend saat ini memakai `nis` dalam beberapa tipe presensi. Tim perlu memilih apakah API menggunakan `studentId` atau NIS untuk relasi; rekomendasi: `studentId` sebagai FK stabil dan sertakan NIS/nama sebagai tampilan bila perlu.

## 5. Pagination dan filter

Frontend memiliki tipe usulan `Page<T>` dengan `items`, `nextCursor`, dan `total`. Contoh:

```json
{
  "items": [],
  "nextCursor": null,
  "total": 0
}
```

Sepakati batas maksimum `limit`, urutan stabil, perilaku pencarian, dan apakah `total` wajib. Status filter siswa/guru/akun harus membedakan aktif/nonaktif dan hanya Admin yang dapat meminta data nonaktif. Server tetap menerapkan scope role pada hasil.

## 6. Keputusan kontrak yang harus disepakati sebelum coding adapter

1. Bare JSON object atau envelope `{data: ...}`.
2. Metode/route final, nama field, format tanggal/waktu, status enum, dan representasi nullable.
3. `studentId` atau NIS pada foreign key presensi.
4. Semantik PUT batch, idempotency key, duplikasi, dan update bersamaan (misalnya ETag/version).
5. Cursor pagination, sorting, filter, dan nilai maksimum limit.
6. Cookie/session, domain, SameSite, CSRF, CORS, durasi dan pembatalan sesi.
7. Bentuk error final, `requestId`, field validation, dan pemetaan ke pesan pengguna.
8. Kebijakan penghapusan, audit log, reset password, hari efektif, kalender libur, zona waktu.
9. Apakah laporan/ekspor diproses di frontend atau server.
