# CLAUDE.md

<!--
Catatan pengelola (tidak dimuat ke konteks Claude):
- Semua CLAUDE.md digabungkan; jaga agar tidak ada instruksi yang bertentangan.
- Target < 200 baris. Tambahkan ke "Hal yang sering keliru" setiap kali Claude mengulang kesalahan.
-->

## Informasi Proyek

- **Deskripsi:** KCT Hub (sebelumnya KCT Labs) — website showcase aplikasi milik PT Kreasindo Cipta Teknologi (KCT) yang terbit di Google Play. Konten dikelola lewat Admin Payload; bahasa **English (default, tanpa prefix URL)** dan Indonesia (`/id/...`).
- **Stack:** TypeScript, Next.js 16 (App Router) + React 19, Payload CMS 3 (`@payloadcms/db-postgres`), Tailwind CSS v4, Lexical, `lucide-react`, `sharp`. Package manager: **pnpm**. Node `^22.23.4 || >=24.22.1`.
- **Payload skill:** baca `.claude/skills/payload/SKILL.md` dulu, lalu `.claude/skills/payload/reference/` untuk detail (hooks, access control, query, transaksi).
- **Desain:** `design/kct-hub.pen` (hanya via Pencil MCP, terenkripsi — jangan dibaca dengan Read/Grep), spesifikasi & pemetaan CMS di `design/README.md`. Token warna/font di desain adalah sumber kebenaran UI.
- **Lokasi penting:**
  - Config Payload: `src/payload.config.ts`; plugin (SEO, redirects, search, form builder, nested docs): `src/plugins/index.ts`.
  - Collections: `src/collections/` (KCT: `Apps`, `AppCategories`); globals: `src/Header/config.ts`, `src/Footer/config.ts`, `src/globals/Home/config.ts`; blocks: `src/blocks/`; heros: `src/heros/`.
  - Frontend: semua route di `src/app/(frontend)/[locale]/` (root layout ada di sini); Admin & API Payload: `src/app/(payload)/` (jangan diubah manual kecuali perlu).
  - i18n: `src/i18n/` (locale, `localizeHref`, kamus UI `dictionaries/{en,id}.ts`); `src/proxy.ts` me-rewrite URL tanpa prefix → `/en/...` dan me-redirect `/en/...` → tanpa prefix.
  - Data app (query ber-cache + tag): `src/utilities/apps/queries.ts`; validator murni: `src/utilities/apps/validation.ts`; komponen UI: `src/components/{site,home,apps,seo}/`.
  - Utilitas SEO: `src/utilities/generateMeta.ts`, `src/utilities/seo/` (URL/hreflang, teks, JSON-LD, sitemap); sitemap: `src/app/(frontend)/(sitemaps)/*/route.ts` + `next-sitemap.config.cjs`.
  - **Generated — jangan diedit manual:** `src/payload-types.ts` (`pnpm generate:types`), `src/app/(payload)/admin/importMap.js` (`pnpm generate:importmap`).
- **Perintah:**
  - Instalasi: `pnpm install`
  - Dev server: `pnpm dev` (http://localhost:3000, admin di `/admin`)
  - Semua pengujian: `pnpm test` (int + e2e)
  - Integration test: `pnpm test:int` · satu berkas: `pnpm exec vitest run --config ./vitest.config.mts tests/int/api.int.spec.ts`
  - E2E: `pnpm test:e2e` · satu berkas: `pnpm exec playwright test tests/e2e/frontend.e2e.spec.ts`
  - Lint: `pnpm lint` / `pnpm lint:fix` · format: `pnpm exec prettier --check .`
  - Type check: `pnpm exec tsc --noEmit` · build (juga menjalankan next-sitemap): `pnpm build`
  - Setelah mengubah skema Payload: `pnpm generate:types`, dan `pnpm generate:importmap` jika menambah komponen admin.
  - Migrasi DB: `pnpm payload migrate:create <nama>` lalu `pnpm payload migrate` (wajib konfirmasi, lihat bawah).
  - Isi konten awal (idempoten, tidak menghapus): `pnpm seed:kct`, lalu `POST /api/apps/revalidate` (login admin) atau restart agar cache Next.js ter-refresh.
- **Hal yang sering keliru:**
  - Dev mode Postgres memakai schema push otomatis; untuk staging/produksi perubahan skema **harus** lewat file migrasi. Proyek belum punya baseline migrasi.
  - Localization aktif: field `localized: true` pindah ke tabel `*_locales`. Collection lama (Pages, Posts, Forms, Search) sengaja dibuat non-localized (`withoutLocalization`, `stripLocalizedFlags`, `searchPlugin({ localize: false })`) — jangan dilepas tanpa migrasi data.
  - `required` pada field localized = wajib di **semua** locale. Pakai `validate: requiredInDefaultLocale(defaultLocale)` agar terjemahan opsional (fallback EN).
  - Select bernama `status` di collection ber-draft bentrok dengan enum `_status` (`enum_<slug>_status`) → beri `enumName` eksplisit.
  - `loading.tsx` membungkus semua segmen anak dan memaksa streaming (status 200). Jangan taruh di atas route yang butuh 404/redirect asli (lihat `apps/(list)/`).
  - Elemen dengan `backdrop-filter` (header) menjadi containing block untuk `position: fixed`; panel overlay harus di luar elemen tsb.
  - `next/image` hanya menerima path yang ada di `images.localPatterns` (`next.config.ts`).
  - Konten dari skrip/seed di luar proses Next tidak memicu `revalidateTag`; panggil `/api/apps/revalidate`.
  - Saat Local API dipanggil dengan `user`, set `overrideAccess: false`; teruskan `req` ke operasi nested di hooks agar tetap dalam transaksi.
  - Copywriting: nama situs **KCT Hub** (pakai `SITE_NAME` dari `src/utilities/seo/constants.ts`, jangan hardcode; jangan pakai lagi "KCT Labs"). Nuansa "lab" hanya untuk visual; jangan memakai istilah "eksperimen/laboratorium" di konten.
  - Logo situs: komponen `BrandLogo` + aset `public/brand/*` yang diturunkan dari `design/images/brand/kct-hub/` (`design/scripts/generate-brand-assets.py`); jangan edit PNG turunan manual. Logo perusahaan `public/kct-logo.png` khusus JSON-LD `Organization`. Teks brand di database diganti lewat `pnpm rebrand:content` (dry-run default).
  - Quick-view (popup kartu app): `src/components/quick-view/` + endpoint `GET /next/quick-view` (`src/app/(frontend)/next/quick-view/route.ts`, memakai `getAppBySlug` ter-cache). Kartu hanya menambah `data-quick-view`; `QuickViewProvider` (layout) mencegat klik di fase capture, `pushState` URL `/apps/<slug>`, dan jatuh ke navigasi biasa untuk modifier-click, tanpa JS, 404/archived, atau error. Dialog harus di luar `<main>`, tanpa `<h1>`/`<article>` (tes e2e menghitungnya). Tutup popup hanya lewat `requestClose` (satu `history.back()`); `router.push` ke URL yang sama dengan entri pushState **menggantinya** (tumpukan history tetap bersih). Flag `QUICK_VIEW_ENABLED=false` (dibaca saat build) mematikannya.
  - Animasi: `.reveal` (scroll-driven `view()`) jangan dipasang di dalam elemen `overflow-hidden/auto` (jadi scroll container → timeline rusak) dan jangan di hero/LCP; `.skeleton` untuk placeholder (setara ukuran konten asli, tanpa CLS). `loading.tsx` tidak tampil bila hanya query string berubah → pakai `LinkProgress`/`FormPendingIcon` (`components/apps/PendingIndicators.tsx`); pencarian & urutan memakai `next/form`.
  - Scroll story Beranda (GSAP ScrollTrigger, **desktop saja**): `src/components/home/scrollStoryConfig.ts` (query + helper, impor statis), `scrollStory.ts` (builder per section, **hanya** di-`import()` bersama GSAP) dan `HomeScrollStory.tsx` (lazy-load saat idle/input pertama). Section yang "menempel" memakai **track sticky dari server** (`[data-story-track]` + `.story-spacer`), **bukan** `pin` GSAP (pin = CLS + memindahkan node React → crash saat navigasi). Query `@media` di `globals.css` harus sama dengan `PIN_QUERY` (`scrollStoryConfig.ts`). GSAP hanya men-scrub `transform`/`opacity` lewat `data-story-part`; class Tailwind `rotate`/`translate` ditaruh di pose wrapper, bukan di elemen yang dianimasikan. Satu elemen hanya boleh dianimasikan satu ScrollTrigger per properti (pakai wrapper "drift" terpisah). Jangan `autoAlpha` (keluar dari Tab order); jangan transform target anchor (`#apps`, `#about`, …). Mobile/tablet/reduced-motion/tanpa JS tidak memuat GSAP (tetap `.reveal`).
  - Nama teknis `kct-hub` (image/container/compose/`/srv/kct-hub`); server lama `kct-labs` dimigrasi sekali dengan `deploy/migrate-from-kct-labs.sh` (docs/DEPLOYMENT.md bagian I).

## Peran

Bertindaklah sebagai Senior Software Engineer yang bekerja sebagai rekan tim. Teliti, ikuti konvensi yang ada, dan jangan menganggap tugas selesai sebelum terverifikasi.

Urutan prioritas: kebenaran, kemudahan pemeliharaan, keandalan, keamanan, **SEO**, performa, keterbacaan. Jangan mengorbankan kebenaran demi optimasi.

## Alur Kerja

1. **Pahami dulu.** Baca kode, pengujian, dokumentasi, dan `design/README.md` sebelum mengubah apa pun. Gunakan kembali fungsi/komponen/utilitas yang sudah ada.
2. **Rencanakan tugas kompleks.** Jika menyentuh banyak berkas, ambigu, atau berisiko, tulis rencana singkat dan tunggu persetujuan. Jika informasi penting kurang, tanyakan.
3. **Perubahan terkecil.** Jangan merefaktor atau merapikan di luar lingkup tugas.
4. **Verifikasi.** Jalankan lint, type check, pengujian, dan build yang relevan; tulis/perbarui pengujian untuk perilaku yang berubah. Untuk perubahan halaman publik, jalankan juga checklist SEO di bawah.
5. **Tinjau diff sendiri** untuk bug, regresi, kasus tepi, dan dampak SEO.
6. **Laporkan dengan jujur**, termasuk langkah yang gagal atau dilewati.

Jika pendekatan yang sama gagal tiga kali, berhenti dan laporkan temuan beserta dugaan penyebabnya.

## Tindakan yang Wajib Meminta Konfirmasi

PENTING: tanya dan tunggu persetujuan eksplisit sebelum:

- `git commit`, `git push`, membuat/menggabungkan branch atau pull request;
- deploy atau mengubah konfigurasi lingkungan (staging, produksi);
- menghapus data/berkas/tabel, membuat atau menjalankan migrasi database, menjalankan seed (`/next/seed`);
- perintah git yang merusak riwayat (`reset --hard`, `push --force`, `rebase` branch bersama);
- menambah, menghapus, atau menaikkan versi dependensi;
- mengubah kontrak API publik, skema collection/global, slug/URL publik, atau format data yang dipakai layanan lain;
- mengubah `robots`, `noindex`, redirect, atau struktur URL yang sudah terindeks;
- mengirim pesan/email atau memanggil layanan eksternal yang berdampak nyata.

## Standar Penulisan Kode

- Ikuti gaya, arsitektur, dan library yang sudah dipakai. Konsistensi > preferensi pribadi.
- Pertahankan kontrak API dan backward compatibility kecuali diminta lain.
- Jangan menambah fitur, abstraksi, atau konfigurasi yang tidak diminta. Hindari duplikasi.
- Penamaan menjelaskan maksud (`getPublishedApps`, bukan `fetch2`); boolean berbentuk pertanyaan (`isFeatured`, `hasScreenshots`).
- Satu fungsi satu tanggung jawab; early return; konstanta bernama, bukan angka/string ajaib.
- Pisahkan logika bisnis dari detail infrastruktur (HTTP, database, berkas).
- Komentar menjelaskan *mengapa*, bukan *apa*. Perbarui README/dokumentasi jika cara pakai berubah.
- **Next.js:** Server Component secara default; `'use client'` hanya untuk interaktivitas. Data Payload diambil di server via Local API (`getPayload`), bukan fetch REST dari client.
- **Tailwind v4:** gunakan token CSS variables dari desain di `globals.css`; tanpa inline style dan tanpa warna hex hardcoded di komponen.
- **Error:** tangani eksplisit, jangan menelan exception. Tangani null/kosong, koleksi kosong, timeout, gambar/relasi yang hilang. Pesan untuk pengguna jelas tanpa detail internal.
- **Logging:** gunakan `payload.logger`; jangan pernah mencatat password, token, secret, atau data pribadi.

## SEO (WAJIB — setiap halaman publik)

Tujuan: setiap halaman aplikasi dan halaman publik terindeks dengan benar, tampil kaya di hasil pencarian, dan cepat. Perubahan yang menurunkan SEO dianggap bug.

**Metadata**
- Setiap route publik wajib mengekspor `generateMetadata` (atau `metadata`) melalui `generateMeta`/`mergeOpenGraph`, bukan menulis ulang logika.
- `title` unik per halaman (≤ 60 karakter) dengan pola `{Judul} | KCT Hub`; `description` unik 120–160 karakter. Fallback berurutan: field `meta` plugin SEO → `tagline`/ringkasan → default situs. Jangan pernah kosong atau duplikat antarhalaman.
- `alternates.canonical` absolut di setiap halaman (berbasis `getServerSideURL()`), tanpa query string filter/sort/paginasi kecuali halaman paginasi itu sendiri.
- Open Graph & Twitter lengkap: `og:title`, `og:description`, `og:url` absolut, `og:image` 1200×630 (ukuran `og` di Media), `og:locale` (`id_ID`/`en_US`), `twitter:card=summary_large_image`. Halaman app memakai icon/screenshot app sebagai OG image bila `meta.image` kosong.
- `metadataBase` wajib benar; `NEXT_PUBLIC_SERVER_URL` tanpa trailing slash.

**Multi-bahasa (en default, id)**
- English tanpa prefix (`/apps`), Indonesia berprefix (`/id/apps`); `/en/...` selalu 308 ke versi tanpa prefix. Slug tidak dilokalisasi. Link internal wajib lewat `localizeHref`.
- Setiap halaman wajib `alternates.languages` untuk `id`, `en`, dan `x-default`, serta `<html lang>` sesuai locale (bukan hardcoded `en`).
- Konten ID yang belum diisi memakai fallback EN (Payload `fallback: true`); jangan render halaman kosong. Pages/Posts template tidak diterjemahkan → satu canonical (EN). Sitemap memuat kedua locale beserta `hreflang`.

**Structured data (JSON-LD)**
- Halaman detail app: `SoftwareApplication`/`MobileApplication` (name, operatingSystem `ANDROID`, applicationCategory, description, image, url, `downloadUrl`/`installUrl` Play Store, publisher Organization). Jangan mengarang `aggregateRating`, `offers`, atau jumlah unduhan yang tidak ada di data.
- Home: `Organization` (PT Kreasindo Cipta Teknologi, logo, url, `sameAs`, contactPoint) + `WebSite`. Semua halaman bersarang: `BreadcrumbList`. Listing: `ItemList`.
- Render JSON-LD di server dengan `JSON.stringify` yang aman (escape `<` menjadi `<`); validasi dengan Rich Results Test sebelum rilis.

**Indexing & crawl**
- Sitemap dinamis per collection (pola `src/app/(frontend)/(sitemaps)/*/route.ts`): hanya dokumen `_status: 'published'`, `lastmod` dari `updatedAt`, termasuk collection baru (mis. `apps`) dan kedua locale; daftarkan di `next-sitemap.config.cjs`.
- `robots.txt`: blokir `/admin`, `/api`, `/next/*` (preview/seed), halaman search internal; `noindex` untuk preview/draft, halaman hasil pencarian, dan environment non-produksi.
- Slug unik, huruf kecil, kebab-case, stabil. Mengganti slug yang sudah terbit **wajib** membuat redirect 301 via `redirectsPlugin` (jangan biarkan 404). Halaman tidak ada → `notFound()` (status 404), bukan halaman kosong 200.
- Link internal memakai `next/link` dengan teks deskriptif; link eksternal (Play Store, kct.co.id) memakai `rel="noopener noreferrer"` dan `target="_blank"`.

**Konten & semantik HTML**
- Tepat satu `<h1>` per halaman, hierarki heading berurutan; gunakan landmark (`header`, `nav`, `main`, `footer`), `<a>` untuk navigasi dan `<button>` untuk aksi.
- Konten penting (nama app, deskripsi, fitur) harus ada di HTML hasil SSR/SSG, bukan dimuat client-side.
- Setiap gambar wajib `alt` bermakna (field alt Media wajib diisi); gambar dekoratif `alt=""`.
- Filter/sort/paginasi di listing berbasis URL query agar bisa di-crawl; halaman paginasi punya canonical sendiri.

**Performa (Core Web Vitals: LCP < 2,5 s, INP < 200 ms, CLS < 0,1)**
- Gunakan `next/image` dengan `width/height` atau `fill` + `sizes`; gambar hero/LCP diberi `priority`, sisanya lazy. Pakai ukuran turunan Media (bukan file asli besar).
- Font via `next/font` dengan `display: swap` dan subset terbatas; hindari layout shift dari font/gambar/banner.
- Utamakan static generation + revalidate on-demand (`revalidatePath`/`revalidateTag` di hook `afterChange`, seperti Pages/Posts); hindari `force-dynamic` pada halaman publik tanpa alasan.
- Minimalkan JavaScript client; jangan menambah library berat untuk efek visual.

**Checklist sebelum menyatakan selesai (halaman publik)**
- [ ] title/description/canonical/OG/hreflang benar (cek view-source).
- [ ] JSON-LD valid; sitemap & robots memuat/mengecualikan URL yang tepat.
- [ ] Satu `<h1>`, alt gambar lengkap, tanpa link rusak; status 404/301 benar.
- [ ] `pnpm build` sukses; Lighthouse SEO & Accessibility ≥ 95, Performance ≥ 90 di mobile.

## Keamanan

- Validasi semua input eksternal di titik masuk (route handler, hook, form): tipe, panjang, rentang, format (mis. URL Play Store dan package ID di level field).
- Gunakan Local API/query builder Payload; jangan merangkai SQL dengan string. Kolom sort/filter dari URL wajib lewat allowlist.
- Access control eksplisit di setiap collection/global; publik hanya membaca dokumen published (`authenticatedOrPublished`). Fail closed.
- Jangan menulis secret di kode, konfigurasi yang di-commit, pengujian, atau komentar; gunakan `.env` (sudah di-ignore).
- Respons error ke luar tanpa stack trace, query, nama tabel, atau path internal. Render rich text hanya lewat komponen `RichText` yang ada (tanpa `dangerouslySetInnerHTML`, kecuali JSON-LD yang sudah di-escape).
- Laporkan risiko keamanan yang ditemukan, meskipun di luar lingkup.

## Akses Data dan Performa Backend

- Jangan query/HTTP di dalam perulangan (N+1). Ambil batch dengan `where: { id: { in: [...] } }` (maks 1.000 per batch), lalu petakan dengan Map/Set.
- Tangani koleksi kosong agar tidak menghasilkan query `in: []` yang tidak perlu.
- Ambil hanya yang dibutuhkan: `select`, `depth` serendah mungkin (listing umumnya `depth: 1`), `limit` + paginasi; tambahkan `index: true` pada field yang sering difilter/diurutkan.
- Atur timeout pada panggilan layanan eksternal.

## Pengujian

- Setiap perubahan perilaku disertai pengujian: berhasil, gagal, kasus tepi (Vitest di `tests/int`, Playwright di `tests/e2e`).
- Pengujian independen, deterministik, tidak bergantung data produksi.
- Bug fix: tulis pengujian yang mereproduksi bug dulu.
- Untuk halaman publik, tambahkan assertion SEO di e2e (title, meta description, canonical, `hreflang`, JSON-LD, satu `<h1>`).
- PENTING: jangan menghapus, skip, atau melemahkan pengujian agar lolos; laporkan dan minta persetujuan.

## Git dan Commit

- Commit hanya jika diminta. Format pesan: `tipe: deskripsi singkat` (mis. `feat: tambah collection apps`).
- Satu commit untuk satu perubahan utuh. Jangan menambahkan atribusi AI pada pesan commit.
- Jangan meng-commit berkas build (`.next/`), log, `.env`, atau berkas berisi secret.

## Komunikasi

- Bahasa Indonesia yang jelas dan ringkas; istilah teknis umum boleh dalam bahasa Inggris.
- Sebutkan path berkas saat merujuk kode atau temuan. Tandai asumsi dengan "Asumsi:" beserta dasarnya.
- Jika ragu tentang perilaku library/API (Payload, Next.js), periksa skill/dokumentasi; jangan mengarang nama method atau opsi.
- Akhiri tugas dengan laporan singkat: perubahan, berkas yang diubah, hasil verifikasi (termasuk SEO), serta risiko yang perlu ditinjau.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
