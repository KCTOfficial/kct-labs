# KCT Hub

Website showcase aplikasi milik **PT Kreasindo Cipta Teknologi (KCT)** yang terbit di Google Play. Seluruh konten (app, kategori, beranda, header, footer, SEO) dikelola lewat Admin Payload.

- **Bahasa:** English (default, tanpa prefix — `/apps`) dan Indonesia (`/id/apps`). `/en/...` selalu 308 ke versi tanpa prefix. Terjemahan ID yang kosong otomatis memakai EN.
- **Stack:** Next.js 16 (App Router) + React 19, Payload CMS 3 (`@payloadcms/db-postgres`), Tailwind CSS v4, TypeScript. Package manager **pnpm**, Node `^22.23.4 || >=24.22.1`.
- **Deployment:** Docker + Docker Compose di VPS Linux. Panduan: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Branding (logo resmi, aset turunan, komponen `BrandLogo`): lihat bagian _Brand KCT Hub_ di [design/README.md](design/README.md). Situs ini sebelumnya bernama **KCT Labs**; migrasi server & konten lama dijelaskan di [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) bagian I.

Panduan kerja untuk developer/AI (konvensi, aturan SEO, hal yang sering keliru) ada di [CLAUDE.md](CLAUDE.md). Spesifikasi desain di [design/README.md](design/README.md).

## Fitur

- Halaman: beranda, daftar app (`/apps`, filter kategori berbasis URL), detail app (`/apps/<slug>`), pencarian, serta Pages/Posts bawaan template.
- Collection KCT: `Apps` (draft/publish, icon, screenshot, fitur, link Play Store, status rilis) dan `AppCategories`; global `Home`, `Header`, `Footer`.
- SEO: metadata unik per halaman, canonical + `hreflang` (en, id, x-default), Open Graph/Twitter, JSON-LD (`Organization`, `WebSite`, `ItemList`, `BreadcrumbList`, `MobileApplication`), sitemap dinamis kedua locale, `robots.txt`, 404 asli, redirect 301 lewat plugin Redirects.
- Performa: halaman statis + revalidasi on-demand (`revalidateTag`) saat konten dipublish, `next/image`, CSS inline. Lighthouse mobile ≥ 90, SEO/Accessibility/Best Practices 100.

## Pengembangan lokal

Prasyarat: Node 22.23.4+, pnpm, PostgreSQL.

```bash
cp .env.example .env        # isi DATABASE_URL, PAYLOAD_SECRET, dll.
pnpm install
pnpm dev                    # http://localhost:3000, admin di /admin
```

Buka `/admin` untuk membuat user admin pertama. Untuk mengisi konten awal KCT (idempoten, tidak menghapus data):

```bash
pnpm seed:kct
```

Lalu panggil `POST /api/apps/revalidate` (login admin) atau restart server agar cache Next.js ter-refresh.

> Dev mode Postgres memakai schema push otomatis. Untuk produksi, perubahan skema **wajib** lewat file migrasi — lihat [Migrasi](#migrasi-database).
>
> `docker-compose.yml` adalah sisa template (MongoDB + yarn) dan **tidak** dipakai proyek ini. Untuk produksi gunakan `docker-compose.prod.yml` via `deploy/deploy.sh`.

### Variabel lingkungan

| Variabel                 | Keterangan                                                       |
| ------------------------ | ---------------------------------------------------------------- |
| `DATABASE_URL`           | Connection string PostgreSQL                                     |
| `PAYLOAD_SECRET`         | Secret enkripsi JWT (64 hex acak)                                |
| `NEXT_PUBLIC_SERVER_URL` | URL publik tanpa trailing slash (dipakai canonical, OG, sitemap) |
| `CRON_SECRET`            | Autentikasi job terjadwal                                        |
| `PREVIEW_SECRET`         | Validasi request preview draft                                   |
| `DISALLOW_INDEXING`      | `true` di staging → `noindex` + robots Disallow-all              |
| `PORT`                   | (produksi) port publik di host; container tetap listen di 3000   |

Contoh: [.env.example](.env.example). Env produksi (`.env.prod`) berisi secret, **tidak** disimpan di repo; buat manual di server dari `.env.example`.

## Perintah

| Perintah                          | Fungsi                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm dev`                        | Dev server                                                                              |
| `pnpm build` / `pnpm start`       | Build produksi (+ next-sitemap) / jalankan hasil build                                  |
| `pnpm lint` / `pnpm lint:fix`     | ESLint                                                                                  |
| `pnpm exec tsc --noEmit`          | Type check                                                                              |
| `pnpm test`                       | Integration (Vitest) + E2E (Playwright)                                                 |
| `pnpm test:int` / `pnpm test:e2e` | Salah satu saja                                                                         |
| `pnpm generate:types`             | Regenerasi `src/payload-types.ts` setelah ubah skema                                    |
| `pnpm generate:importmap`         | Regenerasi import map admin setelah menambah komponen admin                             |
| `pnpm seed:kct`                   | Seed konten KCT (idempoten)                                                             |
| `pnpm rebrand:content`            | Ganti "KCT Labs" → "KCT Hub" di konten DB (dry-run; `REBRAND_APPLY=true` untuk menulis) |

## Migrasi database

Baseline migrasi: `src/migrations/20261109_113225_initial`. Setiap perubahan skema:

```bash
pnpm payload migrate:create <nama>   # di lokal, commit file migrasinya
pnpm payload migrate                 # di produksi otomatis dijalankan oleh deploy.sh
```

`deploy.sh` menjalankan `scripts/migration-preflight.ts` lebih dulu dan menolak deploy bila database berada dalam mode dev-push (mencegah prompt interaktif / kehilangan data).

## Deploy ke VPS

Ringkasnya (detail di [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)):

```bash
# sekali saja
mkdir -p <APP_DIR> <DATA_DIR>/{media,state}
chown -R 1001:1001 <DATA_DIR>/media
git clone <REPO_URL> <APP_DIR>
cd <APP_DIR> && chmod +x deploy/deploy.sh
# buat .env.prod dari .env.example lalu: chmod 600 .env.prod

# setiap rilis
cd <APP_DIR>
./deploy/deploy.sh            # pull → build → migrate → up → health check (rollback otomatis bila gagal)
./deploy/deploy.sh status
./deploy/deploy.sh rollback
```

Alur: ubah kode di laptop → commit → push → jalankan `deploy.sh` di server. Jangan mengedit file ter-track langsung di server (deploy akan ditolak). Restore database awal dan penyalinan media dijelaskan di runbook.

## Struktur penting

```
src/
  app/(frontend)/[locale]/   route publik (root layout per locale)
  app/(payload)/             admin & REST API Payload
  collections/               Apps, AppCategories, Pages, Posts, Media, ...
  globals/Home/, Header/, Footer/   global Home, Header, Footer
  i18n/                      locale, localizeHref, kamus UI
  proxy.ts                   rewrite/redirect prefix locale
  utilities/apps/            query ber-cache + validator
  utilities/seo/             URL/hreflang, JSON-LD, sitemap
  migrations/                migrasi Payload
scripts/                     seed-kct.ts, migration-preflight.ts
deploy/deploy.sh             skrip deploy/rollback/status
Dockerfile, docker-compose.prod.yml
docs/DEPLOYMENT.md           runbook produksi
design/                      desain (.pen via Pencil) + spesifikasi
```
