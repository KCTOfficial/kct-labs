# Deployment KCT Hub — VPS + Docker + Postgres terkelola

Placeholder yang dipakai di dokumen ini: `<APP_DIR>` (folder source di server), `<DATA_DIR>` (folder data, mis. `/srv/kct-hub`), `<REPO_URL>` (URL git repo), `<SERVER_IP>` (IP server), `<PORT>` (port publik).

Arsitektur: **VPS Linux** (contoh sizing: 2 vCPU, ±4 GB RAM, 8 GB swap; bisa dipakai bersama container lain) → build di Docker pada VPS → container `kct-hub-app` dipublish di `http://<SERVER_IP>:<PORT>` (port internal container tetap 3000). Database: **Postgres terkelola/terpisah** (`DATABASE_URL`). Upload media disimpan di disk VPS (`<DATA_DIR>/media`), **bukan** di database.

> Port **6000 tidak dipakai** karena diblokir semua browser utama (`ERR_UNSAFE_PORT`). `deploy.sh` menolak port-port terblokir seperti ini.
> Tanpa domain/HTTPS, login admin berjalan lewat HTTP (tidak terenkripsi) dan SEO berbasis IP kurang ideal — lihat bagian H.

| File | Fungsi |
|---|---|
| `Dockerfile` | target `runner` (aplikasi) & `migrator` (menjalankan `payload migrate`) |
| `docker-compose.prod.yml` | definisi container produksi (port publik, volume media, batas resource, healthcheck, log rotation) |
| `deploy/deploy.sh` | `deploy` / `rollback` / `status` / `start` |
| `deploy/migrate-from-kct-labs.sh` | migrasi **sekali** server lama bernama `kct-labs` → `kct-hub` (bagian I) |
| `deploy/nginx/kct-hub.conf.example` | (opsional, saat domain siap) reverse proxy + HTTPS |
| `scripts/rebrand-content.ts` | ganti teks "KCT Labs" → "KCT Hub" di konten database (dry-run default, bagian I) |
| `scripts/migration-preflight.ts` | cek non-interaktif penanda "dev push" sebelum migrasi (mencegah deploy menggantung) |
| `src/migrations/20261109_113225_initial.*` | **baseline** migrasi = skema DB saat ini (101 tabel) |
| `.env.prod` | env produksi, **tidak** ada di repo (berisi secret; dibuat manual di server dari `.env.example`, dipakai oleh `deploy.sh` dari `<APP_DIR>/.env.prod`) |

---

## A. Persiapan VPS (sekali saja)

Semua perintah dijalankan sebagai **`root`** (tidak perlu membuat user baru). Container aplikasi tetap berjalan sebagai user **non-root uid 1001** di dalam Docker.

```bash
# 1. Docker Engine + compose plugin (Ubuntu 22.04): https://docs.docker.com/engine/install/ubuntu/
apt-get update && apt-get install -y git curl util-linux
docker --version && docker compose version          # compose v2 wajib

# 2. Folder data (di luar repo agar tidak tertimpa git)
mkdir -p <DATA_DIR>/{media,state}
chown -R 1001:1001 <DATA_DIR>/media                 # uid user aplikasi di dalam container

# 3. Source code
git clone <REPO_URL> <APP_DIR>
cd <APP_DIR> && git checkout master
chmod +x deploy/deploy.sh
cp .env.example .env.prod                            # isi nilai produksi (jangan di-commit)
chmod 600 .env.prod                                  # hanya root yang boleh membaca secret

# 4. Firewall. PENTING: port yang dipublish Docker MELEWATI ufw. Batasi akses dengan
#    firewall tingkat provider (Cloud Firewall): inbound 22 (IP admin saja) + <PORT>.
ufw allow OpenSSH && ufw allow <PORT>/tcp && ufw enable
```

**Keamanan login root:** login SSH root hanya dengan SSH key — di `/etc/ssh/sshd_config` set `PermitRootLogin prohibit-password` dan `PasswordAuthentication no`, lalu `systemctl reload ssh`. Pastikan key Anda sudah ada di `~/.ssh/authorized_keys` **sebelum** reload.

**`.env.prod` tidak ada di repo** (berisi secret; sudah di-ignore git). Kelola langsung di server dengan akses terbatas (`chmod 600`) dan simpan salinannya di password manager/secret store. Simpan secret **hanya** di sana, jangan di issue, chat, atau commit.

**Kapasitas disk:** pastikan ruang kosong memadai. Satu deploy butuh ±4–6 GB sementara (image migrator ±1.6 GB, image app, cache build). `deploy.sh` menolak build bila < 8 GB kosong dan otomatis membersihkan image/cache lama. Cek: `df -h /` dan `docker system df`.

**Database terkelola:** izinkan IP VPS di firewall/allowlist DB, buat database & user khusus aplikasi:

```sql
CREATE ROLE kct_app LOGIN PASSWORD '<password-kuat>';
CREATE DATABASE kct_hub OWNER kct_app ENCODING 'UTF8' TEMPLATE template0;
-- Database HARUS kosong sebelum restore (langkah C).
```

**Nginx + HTTPS:** opsional (container bisa dipublish langsung di `<PORT>`). Saat domain siap, lihat bagian H.

---

## B. Backup database dev via DBeaver

> Sumber = DB dev yang sudah berisi konten (hasil `pnpm seed:kct` + edit dari Admin), yaitu database pada `DATABASE_URL` di `.env` lokal (mis. `payload-cms-kct-labs`). Pastikan langkah 2 di bawah menampilkan tabel `apps` berisi data — kalau `relation "apps" does not exist`, Anda membuka database yang salah.

1. **Bekukan perubahan**: hentikan `pnpm dev` dan pastikan tidak ada yang sedang mengedit di Admin.
2. **Catat jumlah data** (untuk verifikasi setelah restore) — SQL Editor DBeaver pada DB dev:
   ```sql
   SELECT 'apps' t, count(*) FROM apps UNION ALL
   SELECT 'app_categories', count(*) FROM app_categories UNION ALL
   SELECT 'media', count(*) FROM media UNION ALL
   SELECT 'pages', count(*) FROM pages UNION ALL
   SELECT 'posts', count(*) FROM posts UNION ALL
   SELECT 'users', count(*) FROM users;
   ```
3. **Siapkan client `pg_dump`**: DBeaver memakai binary PostgreSQL lokal. Versi `pg_dump`/`pg_restore` harus **≥ versi server** (dev dan prod). Atur di *Database → Driver Manager / Local Client* (atau saat dialog meminta "Local client").
4. Klik kanan database dev → **Tools → Backup**:
   - Objek: schema **`public`** → semua tabel (centang semua).
   - **Format: Custom** (file `.backup`; terkompresi, bisa dipulihkan selektif).
   - Compression: default/`9`. Encoding: `UTF8`.
   - Centang **"Do not backup privileges (GRANT/REVOKE)"** dan **"Discard objects owner"** (= `--no-privileges --no-owner`) agar objek nanti dimiliki user DB produksi.
   - **Jangan** centang "Use INSERT" (COPY jauh lebih cepat untuk data besar).
   - Output: misal `kct_hub_YYYYMMDD.backup`. Klik **Start** dan tunggu "Task completed".
5. Simpan file backup di tempat aman (berisi hash password user admin).

---

## C. Restore ke database produksi via DBeaver

1. Pastikan database produksi **kosong** (baru dibuat, langkah A). Jangan restore ke DB yang sudah berisi tabel — gunakan DB baru.
   Lalu jalankan di DB produksi yang **masih kosong** (backup DBeaver per-schema berisi `CREATE SCHEMA public`, yang gagal bila schema itu sudah ada):
   ```sql
   DROP SCHEMA public CASCADE;   -- HANYA pada DB baru yang kosong!
   ```
2. Buat koneksi DBeaver ke DB produksi memakai user `kct_app` (SSL aktif jika provider mewajibkan: tab *SSL* → `require`).
3. Klik kanan database produksi → **Tools → Restore**:
   - Format: **Custom**, pilih file `.backup`.
   - Centang **"No owner"** dan **"No privileges"** (`--no-owner --no-privileges`).
   - **Clean (drop) objects: OFF** (DB kosong). **Create database: OFF**.
   - Jika tersedia, centang **"Single transaction" / "Exit on error"** agar restore gagal total bila ada error (bukan setengah jadi).
   - Klik **Start**. Jika muncul `schema "public" already exists`, langkah 1 (`DROP SCHEMA public CASCADE`) terlewat: buat ulang DB kosong lalu ulangi. Error lain = ulangi di DB kosong yang baru.
4. **Post-restore SQL (WAJIB)** — SQL Editor pada DB produksi:
   ```sql
   BEGIN;
   -- 1) Tandai baseline migrasi sudah diterapkan & hapus penanda "dev push".
   --    Tanpa ini, `payload migrate` di container berhenti diam-diam dan deploy gagal.
   DELETE FROM payload_migrations WHERE batch = -1;
   INSERT INTO payload_migrations (name, batch, updated_at, created_at)
   SELECT '20261109_113225_initial', 1, now(), now()
   WHERE NOT EXISTS (SELECT 1 FROM payload_migrations WHERE name = '20261109_113225_initial');

   -- 2) Bersihkan state milik lingkungan dev.
   DELETE FROM users_sessions;                 -- sesi login dev
   DELETE FROM payload_locked_documents_rels;
   DELETE FROM payload_locked_documents;       -- kunci edit dokumen yang menggantung
   COMMIT;

   -- 3) Verifikasi
   SELECT name, batch FROM payload_migrations ORDER BY id;   -- harus: 20261109_113225_initial | 1
   ```
   Jika langkah ini terlewat, `deploy.sh` berhenti dengan pesan *dev-push marker* (tidak menggantung) — jalankan SQL di atas lalu deploy ulang.
5. **Akun admin**: tinjau `SELECT id, email FROM users;`. Hapus akun uji/template (mis. `demo-author@example.com`) dari Admin setelah deploy, dan **ganti password** semua admin yang berasal dari dev.
6. **Verifikasi jumlah data**: jalankan query langkah B.2 pada DB produksi — angka harus sama.

### Alternatif CLI (setara DBeaver, untuk otomasi)
```bash
# Dump seluruh database (tanpa --schema) → tidak perlu DROP SCHEMA di target.
pg_dump  --format=custom --no-owner --no-privileges -d "$DEV_DATABASE_URL" -f kct_hub.backup
pg_restore --no-owner --no-privileges --single-transaction --exit-on-error -d "$PROD_DATABASE_URL" kct_hub.backup
```

---

## D. Salin file media (WAJIB — gambar tidak ada di database)

Dari mesin dev (folder proyek):

```bash
rsync -avz --progress public/media/ <SSH_USER>@<SERVER_IP>:<DATA_DIR>/media/
# di VPS (file hasil rsync dimiliki user SSH → kembalikan ke user aplikasi):
chown -R 1001:1001 <DATA_DIR>/media
```

Tanpa langkah ini semua ikon/screenshot aplikasi tampil rusak (DB merujuk file yang tidak ada).

---

## E. Deploy

```bash
cd <APP_DIR>
./deploy/deploy.sh            # deploy branch yang sedang di-checkout (env: <APP_DIR>/.env.prod)
./deploy/deploy.sh status     # tag aktif + status container
./deploy/deploy.sh rollback   # kembali ke image sebelumnya (tanpa build)
./deploy/deploy.sh start      # jalankan ulang image yang tercatat (tanpa pull/build/migrasi)
```

Urutan yang dijalankan `deploy.sh`:
1. Lock (mencegah dua deploy bersamaan) & preflight: tools, env (`CHANGE_ME`, CRLF, format URL, port = port di URL, port tidak diblokir browser), **konflik dengan container lain** (port/nama container sudah dipakai stack lain → berhenti), ruang disk ≥ 8 GB, owner folder media.
2. `git pull --ff-only` (gagal jika ada perubahan lokal di VPS).
3. Build image **migrator** → cek penanda dev-push (`scripts/migration-preflight.ts`) → `payload migrate` dengan timeout 15 menit (**sebelum** build app, karena `next build` membaca DB). Pada deploy pertama setelah restore hasilnya *tidak ada migrasi baru*.
4. Build image **app** (env dipasang sebagai BuildKit secret, tidak tersimpan di image).
5. Ganti container → tunggu healthcheck → smoke test `/`, `/id`, `/apps`, `/apps-sitemap.xml`, `/robots.txt`.
6. Gagal → **rollback otomatis** ke image sebelumnya. Berhasil → simpan tag & bersihkan: image app sisa 2 (+current/previous), image migrator hanya yang terbaru, image *dangling* milik proyek ini saja (label `com.kct.project=kct-hub`). Build cache host **tidak** disentuh kecuali `PRUNE_BUILD_CACHE=1`.

Variabel opsional: `BRANCH`, `ENV_FILE` (default: `.env.prod` di `<APP_DIR>`), `MEDIA_DIR`, `APP_PORT` (default: `PORT` di env), `KEEP_IMAGES`, `HEALTH_TIMEOUT`, `MIGRATE_TIMEOUT`, `MIN_FREE_GB`, `FORCE_BUILD=1`, `PRUNE_BUILD_CACHE=1`.

### Contoh sizing (2 vCPU / ±4 GB RAM / 8 GB swap)
| Komponen | Nilai | Alasan |
|---|---|---|
| Container app | `mem_limit 1g` (+512 MB swap), `cpus 1.5`, heap Node 640 MB | idle ±150 MB; cukup untuk Admin & upload (sharp), sisakan ±2,8 GB & 0,5 core untuk OS, stack lain, dan `docker build` |
| Build (`next build`) | RAM host (±2–3 GB puncak) + swap 8 GB | hanya saat deploy; pastikan swap aktif (`swapon --show`) |
| Log container | rotasi 10 MB × 5 | mencegah disk penuh |
| Hardening | `init`, `pids_limit 512`, `nofile 65536`, `cap_drop ALL`, `no-new-privileges` | stabilitas & keamanan |

### Server dipakai bersama container lain
> **Catatan `/run` penuh:** container yang healthcheck-nya gagal terus (`unhealthy` berbulan-bulan) bisa membocorkan ratusan ribu file ke `/run/containerd` hingga tmpfs `/run` penuh → build gagal `mkdir /run/runc: no space left on device`. Cari pelaku: `for d in /run/containerd/io.containerd.runtime.v2.task/moby/*/; do echo "$(find "$d" -xdev | wc -l) $(basename "$d" | cut -c1-12)"; done | sort -n`, lalu restart/stop container itu saja (jangan restart Docker).

Bila VPS juga menjalankan container lain, `deploy.sh` & compose dibuat agar tidak saling ganggu:
- **Isolasi:** compose project `kct-hub`, container `kct-hub-app`, network `kct-hub_default` sendiri; `--remove-orphans` hanya berlaku untuk project ini. Container lain tidak di-stop/restart.
- **Port:** sebelum deploy dicek `docker ps --filter publish=<PORT>` dan `ss -ltn`; bila port sudah dipakai stack lain, deploy berhenti sebelum build. Cek manual: `docker ps --format '{{.Names}}	{{.Ports}}'`.
- **Cleanup:** hanya menghapus image `kct-hub*` dan image dangling berlabel proyek ini. Jangan jalankan `docker system prune -a` / `docker builder prune -af` tanpa memastikan stack lain tidak butuh image/cache-nya.
- **Resource:** container dibatasi 1 GB RAM & 1,5 CPU (dari 2 core). `next build` saat deploy bisa memakai ±2–3 GB RAM & CPU penuh beberapa menit → deploy di jam sepi dan cek dulu `free -h` / `docker stats --no-stream`. Bila total limit semua container mendekati total RAM host, turunkan `mem_limit` atau tambah RAM.
- **Disk:** ambang `MIN_FREE_GB=8` dihitung untuk seluruh host (dipakai bersama); pantau `docker system df`.

Naikkan `mem_limit`/heap bila traffic Admin/upload besar (pantau `docker stats kct-hub-app`).

Downtime: beberapa detik saat container diganti (satu instance). Untuk zero-downtime: dua slot (blue/green, port 3000/3001) + switch upstream Nginx.

---

## F. Perubahan skema berikutnya

1. Di dev ubah collection/field → `pnpm generate:types`.
2. Buat migrasi: `pnpm payload migrate:create <nama_perubahan>` → commit file di `src/migrations/`.
3. Deploy → `deploy.sh` menjalankan migrasi otomatis sebelum build.
4. Migrasi harus **kompatibel mundur** (tambah kolom/tabel dulu, hapus belakangan) karena rollback image **tidak** membatalkan migrasi.
5. **Selalu backup DB produksi** sebelum deploy yang membawa migrasi.

---

## G. Operasional & troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `DB contains the dev-push marker` | Post-restore SQL (C.4) belum dijalankan. |
| `table "apps" is missing` (preflight exit 4) / build gagal `relation "apps" does not exist` | DB produksi **bukan** hasil restore DB dev (mis. salah pilih database saat backup) tetapi C.4 sudah dijalankan. Ulangi B → C dari DB dev yang benar (C sudah mencakup `DROP SCHEMA public CASCADE`), lalu C.4 dan deploy. |
| Build gagal `connect ECONNREFUSED/timeout` / `migration preflight failed (exit 1)` | VPS tidak bisa akses DB: cek allowlist IP, SSL (`sslmode=require`), `DATABASE_URL`. |
| `port ... is blocked by web browsers` | Ganti `PORT` & port di `NEXT_PUBLIC_SERVER_URL` (mis. 6001). |
| `only XGB free on disk` | `docker system df`; `PRUNE_BUILD_CACHE=1 ./deploy/deploy.sh` (cache > 3 hari). `docker builder prune -af` menghapus cache **semua** stack — koordinasikan dulu. |
| `port <PORT> is already published by: ...` / `in use by a host process` | Port dipakai service lain: ganti `PORT` + port di `NEXT_PUBLIC_SERVER_URL` di `.env.prod`, deploy ulang (buka port baru di firewall). |
| `container 'kct-hub-app' exists but belongs to another stack` | Nama bentrok dengan stack lain: jalankan dengan `APP_NAME=<nama-unik>` (ikut mengubah folder `/srv/<APP_NAME>`). |
| Situs tidak bisa dibuka dari luar padahal `status` healthy | Firewall provider / ufw belum membuka `<PORT>`. |
| Gambar 404 | Folder media belum disalin / owner bukan `1001` (langkah D). |
| Canonical/sitemap memakai domain salah | `NEXT_PUBLIC_SERVER_URL` salah → perbaiki lalu `FORCE_BUILD=1 ./deploy/deploy.sh`. |
| Konten baru tidak muncul setelah import/seed/skrip langsung ke DB | `POST /api/apps/revalidate` saat login admin (mis. dari console browser di `/admin`: `fetch('/api/apps/revalidate', { method: 'POST' })`), atau rebuild `FORCE_BUILD=1 ./deploy/deploy.sh`. `docker restart` **tidak** cukup: cache Next.js ada di filesystem container dan halaman prerender di image. |
| Container unhealthy | `docker logs --tail 200 kct-hub-app`. |
| Upload gagal `413` | Naikkan `client_max_body_size` di Nginx. |

**Popup quick-view (flag, endpoint, rollback):** kartu app membuka popup lewat `GET /next/quick-view?slug=&locale=` (JSON read-only, hanya app published non-archived, `Cache-Control: private, max-age=30`; diblokir robots `/next/`). Endpoint publik ini sebaiknya diberi rate limit di nginx (contoh `limit_req` sudah ada di `deploy/nginx/kct-hub.conf.example`). **Status: popup mati secara default** (kartu → halaman penuh). Aktifkan lagi tanpa mengubah kode: set `QUICK_VIEW_CARDS=true` di `.env.prod` lalu `FORCE_BUILD=1 ./deploy/deploy.sh` (flag dibaca saat build karena halaman statis); SEO tidak terpengaruh. Rollback/kill-switch: `QUICK_VIEW_ENABLED=false` atau hapus `QUICK_VIEW_CARDS`, lalu build ulang.

**Google Analytics 4 (aktivasi, privasi, rollback):** isi `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` di `.env.prod` (GA → Admin → Data streams → klik stream web → *Measurement ID*; **bukan** "Stream ID" numerik), lalu `FORCE_BUILD=1 ./deploy/deploy.sh` (dibaca saat build karena halaman statis). Script hanya dimuat di build produksi, tidak di mode preview/draft, tidak di staging (`DISALLOW_INDEXING=true`), dan tidak di `/admin`; ID kosong/salah format = tidak ada script sama sekali (deploy.sh memberi peringatan). Dimuat `lazyOnload` agar LCP/TBT tidak terganggu. Consent Mode v2: `analytics_storage` default **denied** untuk EEA/UK/CH (hanya ping tanpa cookie) dan granted di wilayah lain; sinyal iklan selalu denied. Saat banner consent ditambahkan, panggil `gtag('consent','update',{analytics_storage:'granted'})`. Tidak ada CSP di Next maupun nginx; jika CSP ditambahkan, izinkan `script-src https://www.googletagmanager.com` dan `connect-src https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`. **Rollback:** kosongkan variabel itu lalu deploy ulang. Cek: GA → Reports → Realtime (data standar bisa tertunda hingga 48 jam). Pastikan Kebijakan Privasi situs menyebut penggunaan Google Analytics.

**Backup rutin (rekomendasi):** snapshot otomatis harian dari provider DB (retensi ≥ 7 hari, uji restore berkala) + backup harian folder `<DATA_DIR>/media` (rsync/rclone ke object storage). Untuk skala lebih besar/multi-server pindahkan media ke S3-compatible storage (`@payloadcms/storage-s3`).

---

## H. Saat domain & HTTPS siap (rekomendasi production)

1. Arahkan DNS domain ke `<SERVER_IP>`.
2. Ubah port di `docker-compose.prod.yml` menjadi `'127.0.0.1:${APP_PORT}:3000'` dan set `PORT=3000` di env (container tidak lagi terbuka ke internet).
3. Pasang Nginx + certbot memakai `deploy/nginx/kct-hub.conf.example` (gzip, cache `/_next/static`, batas upload, HSTS).
4. Ganti `NEXT_PUBLIC_SERVER_URL=https://<domain>` lalu `FORCE_BUILD=1 ./deploy/deploy.sh` (canonical, sitemap, OG ikut domain baru).
5. Tambahkan redirect 301 dari `http://<SERVER_IP>:<PORT>` ke domain agar URL IP yang sempat terindeks berpindah.

---

## I. Rebrand KCT Labs → KCT Hub (sekali, untuk server yang sudah berjalan)

Nama teknis berubah dari `kct-labs` ke `kct-hub`: image/container (`kct-hub`, `kct-hub-app`), compose project & network, folder data (`/srv/kct-hub`), lock deploy, label image. Server baru cukup mengikuti bagian A–E. Server yang sudah men-deploy versi `kct-labs` jalankan langkah ini **sekali**, berurutan:

1. **Repo (di GitHub/Git server):** rename repo `kct-labs` → `kct-hub` (GitHub mengalihkan URL lama, tetapi tetap perbarui remote). Di laptop: `git remote set-url origin <REPO_URL>`.
2. **Backup dulu di VPS:** salin `.env.prod` ke tempat aman (mis. `cp <APP_DIR>/.env.prod /root/env-prod.backup && chmod 600 /root/env-prod.backup`) dan pastikan ada backup/snapshot DB terbaru.
3. **Pindahkan folder source** (`.env.prod` ikut pindah karena berada di dalamnya):
   ```bash
   mv /root/projects/kct-labs /root/projects/kct-hub     # sesuaikan dengan <APP_DIR> lama/baru
   cd /root/projects/kct-hub
   git remote set-url origin <REPO_URL>
   git pull --ff-only
   ```
4. **Migrasi identitas Docker + folder data** (downtime beberapa detik; tanpa build; idempoten):
   ```bash
   ./deploy/migrate-from-kct-labs.sh
   ```
   Skrip: retag image `kct-labs:<tag>` → `kct-hub:<tag>` (rollback tetap bisa), hapus container `kct-labs-app`, `mv /srv/kct-labs /srv/kct-hub`, jalankan image yang sama sebagai `kct-hub-app` (`deploy.sh start` + health check), baru setelah sukses menghapus tag/migrator/network lama. Database tidak disentuh. Bila belum pernah deploy, skrip hanya menyiapkan `/srv/kct-hub`.
5. **Deploy kode baru** (logo, favicon, OG image, nama situs, admin): `./deploy/deploy.sh`.
6. **Rebrand teks di database** (judul SEO Home, tagline Footer, dll. — kode tidak bisa mengubah data). Jalankan dari image migrator versi yang baru di-deploy; **dry run dulu**:
   ```bash
   TAG=$(cat /srv/kct-hub/state/current_tag)
   docker run --rm --env-file .env.prod kct-hub-migrator:$TAG pnpm rebrand:content                        # dry run: hanya laporan
   docker run --rm --env-file .env.prod -e REBRAND_APPLY=true kct-hub-migrator:$TAG pnpm rebrand:content  # terapkan
   ```
   Idempoten (jalankan ulang = 0 perubahan); field Indonesia tidak pernah diisi teks English; slug/URL tidak disentuh. Dokumen yang versi terbarunya masih **draft** hanya di-patch sebagai draft dan dicantumkan di log → tinjau & *Publish* di Admin.
7. **Segarkan cache**: login `/admin`, lalu di console browser `fetch('/api/apps/revalidate', { method: 'POST' })` (atau `FORCE_BUILD=1 ./deploy/deploy.sh`). Cek view-source: `<title>` dan `og:site_name` = KCT Hub, `og:image` = `/og-kct-hub.png`.
8. **(Opsional) rename database** `kct-labs` → `kct-hub`. Tidak terlihat pengunjung dan menambah downtime; lakukan hanya bila perlu konsistensi:
   ```bash
   docker stop kct-hub-app      # ALTER DATABASE butuh 0 koneksi aktif
   ```
   ```sql
   -- terhubung ke database lain (mis. postgres/defaultdb), BUKAN ke "kct-labs"
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'kct-labs';   -- harus 0
   ALTER DATABASE "kct-labs" RENAME TO "kct-hub";
   ```
   Lalu ubah nama database di `DATABASE_URL` pada `.env.prod` dan jalankan `./deploy/deploy.sh start`. Di DB terkelola, sesuaikan juga allowlist/pool yang merujuk nama database lama.
9. **Lainnya:** perbarui bookmark/monitoring yang memakai nama container lama (`kct-labs-app`) dan `/srv/kct-labs`. Domain/URL publik tidak berubah sehingga SEO (canonical, sitemap) tetap; Google memperbarui nama situs dari JSON-LD `WebSite` saat crawl berikutnya.
