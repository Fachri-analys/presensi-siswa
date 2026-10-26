# Setup Production

Template ini menyiapkan satu server Linux dengan Docker Compose, PostgreSQL, API, frontend, dan Caddy untuk HTTPS otomatis. Domain, kredensial, DNS, firewall, serta jadwal backup tetap diisi oleh operator sekolah.

## Yang perlu disiapkan

- Satu VM/server Linux dengan Docker Engine dan Docker Compose v2.
- Satu domain yang DNS `A`-nya mengarah ke server. Caddy memerlukan port publik TCP 80/443; UDP 443 opsional untuk HTTP/3.
- Akses SSH ke server dan ruang disk untuk database, unggahan surat, image Docker, serta backup.

Database, API, dan frontend hanya dipublikasikan ke loopback host. Caddy menjadi satu-satunya layanan yang membuka port publik. Database tidak membuka port publik.

## Konfigurasi dan deploy pertama

Di server, clone repository, lalu siapkan env production:

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Isi `DOMAIN`, `PUBLIC_API_BASE_URL`, `POSTGRES_PASSWORD`, `POSTGRES_APP_PASSWORD`, kalender sekolah, dan nilai admin awal. Gunakan password acak URL-safe (misalnya `openssl rand -hex 32`) untuk kedua akun database. `POSTGRES_USER` adalah akun bootstrap khusus migrasi/seed; API berjalan memakai akun `POSTGRES_APP_USER` terpisah yang otomatis dibuat tanpa hak superuser dan tanpa hak membuat schema. Pastikan `PUBLIC_API_BASE_URL` memakai domain yang sama, misalnya `https://presensi.sekolah.sch.id/api/v1/`.

Sebelum deploy, arahkan DNS domain ke server dan izinkan inbound 80/443 pada firewall. Lalu jalankan:

```sh
./scripts/deploy-production.sh
```

Script memvalidasi Compose, membangun image dengan tag commit, menjalankan migrasi database, dan memulai Caddy/API/frontend. Caddy menerbitkan sertifikat TLS otomatis setelah DNS dan port dapat dijangkau.

Untuk membuat admin pertama, isi `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` pada `.env.production` (password minimal 12 karakter dan maksimal 72 byte UTF-8), lalu jalankan sekali:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml --profile setup run --rm seed
```

Setelah seed berhasil, hapus kedua nilai admin dari `.env.production` dan jalankan `./scripts/deploy-production.sh` lagi. Seed tidak mengubah password admin yang sudah ada.

## Verifikasi setelah deploy

```sh
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml exec -T api node -e "fetch('http://127.0.0.1:4000/health/db').then(async r => { console.log(await r.text()); process.exit(r.ok ? 0 : 1) }).catch(() => process.exit(1))"
```

Pastikan layanan `db`, `api`, `web`, dan `caddy` sehat, lalu buka `https://DOMAIN/login` dan coba login. Workflow CI sudah menguji lint, typecheck, dependency audit, unit/E2E, migrasi, build aplikasi, build image, serta validitas file Compose production.

## Backup dan uji pemulihan

Jalankan backup database dan unggahan:

```sh
./scripts/backup-production.sh
```

Script menyimpan backup berformat PostgreSQL custom dan arsip berkas di `backups/` dengan izin file terbatas. Jadwalkan, misalnya setiap hari pukul 02:00, melalui cron pada server:

```cron
0 2 * * * cd /opt/presensi-siswa && ./scripts/backup-production.sh >> /var/log/presensi-backup.log 2>&1
```

Salin hasil backup ke penyimpanan di luar server dengan enkripsi dan retensi yang ditetapkan sekolah. Backup yang hanya berada di server yang sama tidak melindungi dari kerusakan/hilangnya server.

Uji pemulihan pada volume dan database staging terpisah. Buat `.env.staging` dari template, ubah `VOLUME_PREFIX=presensi-staging`, nama domain staging, dan port host. Jalankan database staging dengan project dan env file terpisah:

```sh
APP_ENV_FILE=.env.staging docker compose --env-file .env.staging -p presensi-staging -f docker-compose.production.yml up -d db
```

Pulihkan dump database dan berkas ke staging, bukan production:

```sh
APP_ENV_FILE=.env.staging docker compose --env-file .env.staging -p presensi-staging -f docker-compose.production.yml exec -T db sh -c 'pg_restore --no-owner --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/presensi-db-TIMESTAMP.dump
docker run --rm -v presensi-staging_uploads_data:/data -v "$PWD/backups:/backup:ro" alpine tar -xzf /backup/presensi-uploads-TIMESTAMP.tar.gz -C /data
```

Ganti `TIMESTAMP` dengan nama pasangan file dari satu backup yang sama. Setelah pulih, mulai API staging dan verifikasi login, presensi, laporan, serta unduhan surat. Jangan arahkan project staging ke volume production.

## Setelahnya

- Tetapkan pemantauan uptime, kapasitas disk, kegagalan backup, retensi, dan prosedur pemulihan bersama sekolah.
- Perbarui `SCHOOL_HOLIDAYS` dan `SCHOOL_WORKING_DAYS` sebelum periode laporan dimulai.
- Image Docker yang dibangun diberi tag commit supaya bisa dipilih kembali. Untuk rollback aplikasi ke image yang masih ada di server, jalankan `RELEASE_TAG=<commit-sebelumnya> BUILD_IMAGES=false ./scripts/deploy-production.sh`; rollback database hanya aman bila migrasi tetap kompatibel dengan versi aplikasi tersebut.
- Workflow GitHub Actions memvalidasi perubahan, tetapi tidak melakukan deploy otomatis. Otomatiskan nanti hanya setelah server, akses SSH, dan aturan approval production ditetapkan.
