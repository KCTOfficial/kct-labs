# KCT Labs — Design Spec

File desain: `design/kct-labs.pen` (dibuka dengan Pencil / pen.dev).
Aset: `design/images/brand/*` (logo KCT dari kct.co.id), `design/images/apps/*` (icon 512px + 3 screenshot 720×1280 per app dari Google Play — **sementara**, ganti dengan versi HD).

## Isi file .pen

| Frame | Keterangan |
|---|---|
| Components | Button/Primary, Button/Ghost, Chip/Mono, Tag, Eyebrow, Phone, AppIcon, AppCard, Navbar, Footer, Navbar/Mobile, Footer/Mobile, LangSwitch, LangButton/Mobile (semua reusable) |
| Home — Desktop (Dark / Light / Dark EN) | Navbar → Hero (grid + 3 device) → Aplikasi Kami (filter + 7 kartu + kartu layanan pengembangan) → Sorotan Koorva → Cara Kami Bekerja (4 tahap) → Tentang KCT + Layanan → CTA → Footer |
| Home — Mobile (Dark / Light / Dark EN) | Versi 375px dari Home |
| Apps Listing — Desktop | Header + breadcrumb, filter kategori, search, sort, grid 3 kolom, pagination |
| Listing States | Empty, Loading (skeleton), Error |
| App Detail — Desktop | Identitas app, Spec strip, galeri screenshot, deskripsi + fitur, Lembar Spesifikasi, eksperimen terkait |
| Mobile (375) | Home (Dark/Light), Listing, Detail (sticky install bar), Menu terbuka |
| Versi English (baris paling bawah canvas) | Apps Listing Desktop & Mobile, App Detail Desktop & Mobile, Listing States, Mobile Menu — semua `(Dark, EN)` dengan switcher EN aktif |
| Design Notes — CMS Mapping | Ringkasan pemetaan konten ke Payload |

## Design tokens (variables di .pen, tema `mode: dark | light`)

Diturunkan dari brand KCT (navy `#25508F`, sky `#3CBAF9` dari logo) — tidak disamakan dengan kct.co.id. Nuansa "lab" **hanya pada visual/warna** (ink gelap, grid blueprint, aksen sky, lime sebagai indikator status). Copywriting sengaja netral sebagai showcase aplikasi KCT — hindari istilah "eksperimen/lab" di konten; "KCT Labs" hanya nama situs.

| Token | Dark | Light |
|---|---|---|
| bg | #070D1A | #F4F8FC |
| bg-raised | #0C1628 | #FFFFFF |
| surface / surface-2 | #101D33 / #16263F | #FFFFFF / #EAF2FA |
| border / border-strong | #1E3352 / #2B4A73 | #D3E1EF / #B4CBE2 |
| text-primary / secondary / muted | #EAF2FB / #9DB2CC / #7F95B3* | #0B1A2E / #40566F / #566A81* |
| primary (+foreground) | #3CBAF9 (#04121F) | #1B6FB5 (#FFFFFF) |
| accent-lime | #B6F36A | #3E8A12 |
| warning / danger / success | #F5C451 / #FF6B6B / #4ADE9A | #B45309 / #C53030 / #15803D |
| brand-navy / brand-sky | #25508F / #3CBAF9 | sama |

\* Di kode, `text-muted` digelapkan/diterangkan dari nilai .pen (#6A81A0 / #6A7F96) agar kontras ≥ 4.5:1 (WCAG AA).

Font: **Space Grotesk** (display), **Inter** (body), **JetBrains Mono** (label/kode lab). Radius 8 / 14 / 22.

Implementasi: token → CSS variables di `src/app/(frontend)/globals.css` (`:root` = light, `[data-theme='dark']` = dark — project sudah memakai `data-theme`), font via `next/font/google`. Ikon dari **lucide** (`lucide-react` sudah terpasang). Tidak perlu library tambahan; carousel galeri cukup CSS scroll-snap.

## Pemetaan Payload CMS (sudah diimplementasikan)

> Status: diimplementasikan. Bagian ini mendeskripsikan kode yang ada, bukan rencana.

### Collection `apps` — `src/collections/Apps/`
`name` (tidak diterjemahkan), `slug`, `tagline`*, `shortDescription`* (kartu), `description` (richText), `features[]`, `specs[]` (label/value; baris kosong disembunyikan), `icon` (upload, wajib), `screenshots` (upload hasMany, maks 10), `category` → `app-categories`, `status` (`live | new | beta | archived`, enum `enum_apps_release_status`), `platforms`, `downloadsLabel` (format `100+`, `1,000+`, `10K+`), `ageRating`, `playStoreUrl` (hanya `https://play.google.com`), `packageId` (unik), `privacyPolicyUrl` (https), `supportEmail`, `featured`, `sortOrder`, `publishedAt`, SEO (`meta`), drafts + autosave + jadwal publish, live preview.
`*` = diterjemahkan; wajib hanya di English (Indonesia fallback ke English).
Akses: publik hanya membaca yang *published*; tulis = admin login. Endpoint `POST /api/apps/revalidate` (admin) menyegarkan semua cache.

### Collection `app-categories` — `src/collections/AppCategories/`
`title` (diterjemahkan), `slug`, `sortOrder`. Jumlah per kategori dihitung saat query (1 query untuk semua kategori), tidak disimpan.

### Global `home` — `src/globals/Home/config.ts`
Tab: Hero (badge, headline, subheadline, 2 CTA, `showcaseApps` maks 3), Apps section (judul, `limit`, kartu layanan), Featured (app + app kedua, fitur[] ber-ikon), How we work (langkah[]), About (layanan[]), CTA (WhatsApp, email), SEO. Setiap section bisa dimatikan; nomor section (01, 02, …) dihitung otomatis.
Dipilih Global (bukan Page + blocks) agar skema `pages` yang sudah ada tidak berubah.

### Globals yang ada (tambahan opsional, kompatibel mundur)
`header`: `navItems[].localizedLabel`, `cta` (label, url). `footer`: `navItems[].localizedLabel`, `tagline`, `columns[]`, `contact` (email, WhatsApp, telepon, alamat), `copyrightHolder`.

## Multi-bahasa (English default, Indonesia)

- URL: English tanpa prefix (`/`, `/apps/al-quran-imam`), Indonesia di `/id/...`. `/en/...` → 308 ke versi tanpa prefix. URL lama tetap valid.
- Payload `localization`: `en` (default) + `id`, `fallback: true`. Hanya field konten KCT yang `localized`; Pages/Posts/Forms/Search tetap non-localized (skema & data lama tidak berubah).
- String UI: `src/i18n/dictionaries/{en,id}.ts` (paritas key diuji otomatis).
- SEO: canonical + `hreflang` (`en`, `id`, `x-default`), `<html lang>`, `og:locale`, sitemap `apps-sitemap.xml` per locale.
- Switch bahasa mempertahankan path & query (filter, halaman).

## Edge cases yang sudah didesain / harus diimplementasikan
- Unduhan kosong / `0+` → chip **BARU** (dot kuning) + label "Baru dirilis".
- Tidak ada screenshot → sembunyikan galeri & phone mockup pakai icon besar.
- Field spesifikasi kosong → baris disembunyikan (desain menampilkan "—" hanya sebagai placeholder).
- Filter/search tanpa hasil → Empty State + tombol reset. Data gagal → Error State + coba lagi. Loading → skeleton.
- Nama/deskripsi panjang → clamp 1 baris (nama) / 2–3 baris (deskripsi) di kartu.
- Jumlah app tidak kelipatan kolom → sel kosong (desktop) / kartu "slot terbuka" (home).
- Link eksternal (Play Store, kct.co.id) → `target="_blank" rel="noopener noreferrer"`.

## Rekomendasi production
1. **Performa saat data membesar**: pagination server-side (`limit` 12, `page`), filter & search via query Payload (`where`), index pada `slug`, `status`, `category`, `sortOrder`, `featured`; `depth: 1` + `select` hanya field kartu di listing.
2. **Gambar**: upload HD ke `media`, gunakan `imageSizes` (icon 128/256/512, screenshot 360/720/1080) + `next/image` (`sizes`, lazy, AVIF/WebP via sharp yang sudah ada). Alt text wajib.
3. **Caching**: ISR/`revalidateTag` via afterChange hook (pola sama dengan Pages/Header).
4. **SEO**: plugin-seo per app, JSON-LD `SoftwareApplication`, sitemap (next-sitemap sudah ada) untuk `/apps/[slug]`.
5. **Aksesibilitas**: kontras teks ≥ 4.5:1 di kedua tema, focus ring `primary`, target sentuh ≥ 44px (mobile sudah 44px), `prefers-reduced-motion` untuk animasi device.
6. **Tema**: default mengikuti `prefers-color-scheme`, toggle disimpan di localStorage (pola ThemeProvider yang sudah ada di template).
7. **Keamanan**: validasi URL & packageId di level field, sanitasi richText bawaan Lexical, tidak menampilkan data internal di pesan error.

## Asumsi yang perlu dikonfirmasi
- [ASSUMPTION] Kategori diterjemahkan dari Play Store: Buku & Referensi, Game Edukasi, Pendidikan, Keuangan, Alat Bisnis (Tools), Produktivitas.
- [ASSUMPTION] Deskripsi pendek dan daftar fitur app (selain teks Play Store) adalah draf copywriting — mohon direview.
- [ASSUMPTION] "Cara Kami Bekerja" (Riset → Prototipe → Pengujian → Rilis) dan statistik hero (07 aplikasi, 06 kategori, 100+ unduhan teratas) adalah konten contoh; stats sebaiknya dihitung otomatis dari data.
- [ASSUMPTION] Terjemahan EN adalah draf saya — mohon direview; nama aplikasi & nama layanan tidak diterjemahkan.
- [ASSUMPTION] Koorva dijadikan "Sorotan" (bisa diganti via field `featured`).
- [ASSUMPTION] Kontak (team@kct.co.id, WhatsApp 0812-2334-4939, 021 2922 2999, Jakarta Selatan) diambil dari kct.co.id.
- [ASSUMPTION] Hanya Android (Google Play); field `platform` disiapkan untuk iOS/Web di masa depan.
- Bahasa default English (tanpa prefix), Indonesia di `/id` (dikonfirmasi).
