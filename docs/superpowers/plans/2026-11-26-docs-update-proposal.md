# Usulan pembaruan dokumentasi — rilis locale default ID, carousel hero, tema, ukuran fluid

Status: **USULAN, menunggu persetujuan pemilik.** `CLAUDE.md` dan `design/README.md` sengaja tidak
diubah di branch ini. Setiap butir memuat teks saat ini (berkas:baris, diverifikasi pada commit
`893d63b` + fix wave) dan teks pengganti yang diusulkan.

Sumber kebenaran untuk usulan ini: `src/i18n/config.ts` (`defaultLocale = 'id'`, `fallbackLocales =
{ id: 'en' }`, urutan `locales = ['en', 'id']`), `src/proxy.ts`, `src/app/(frontend)/globals.css`
(token), `src/components/home/Hero*.tsx`, `docs/DEPLOYMENT.md` bagian J.

---

## A. `CLAUDE.md`

### A1. `CLAUDE.md:11` — bahasa default

Saat ini:

> - **Deskripsi:** KCT Hub (sebelumnya KCT Labs) — website showcase aplikasi milik PT Kreasindo Cipta Teknologi (KCT) yang terbit di Google Play. Konten dikelola lewat Admin Payload; bahasa **English (default, tanpa prefix URL)** dan Indonesia (`/id/...`).

Usulan:

> - **Deskripsi:** KCT Hub (sebelumnya KCT Labs) — website showcase aplikasi milik PT Kreasindo Cipta Teknologi (KCT) yang terbit di Google Play. Konten dikelola lewat Admin Payload; bahasa **Indonesia (default, tanpa prefix URL)** dan English (`/en/...`).

### A2. `CLAUDE.md:20` — proxy

Saat ini:

> - i18n: `src/i18n/` (locale, `localizeHref`, kamus UI `dictionaries/{en,id}.ts`); `src/proxy.ts` me-rewrite URL tanpa prefix → `/en/...` dan me-redirect `/en/...` → tanpa prefix.

Usulan:

> - i18n: `src/i18n/` (locale, `fallbackLocales`, `localizeHref`, kamus UI `dictionaries/{en,id}.ts`); `src/proxy.ts` me-rewrite URL tanpa prefix → `/id/...` dan me-redirect (308) `/id/...` → tanpa prefix (query string ikut).

### A3. `CLAUDE.md:38` — `required` pada field localized

Saat ini:

> - `required` pada field localized = wajib di **semua** locale. Pakai `validate: requiredInDefaultLocale(defaultLocale)` agar terjemahan opsional (fallback EN).

Usulan:

> - `required` pada field localized = wajib di **semua** locale. Pakai `validate: requiredInDefaultLocale(defaultLocale)` agar hanya wajib di locale default (**Indonesia**) dan English opsional. Fallback per field hanya `id → en` (`fallbackLocales` di `src/i18n/config.ts`): field ID kosong menampilkan EN, tetapi **English tidak punya fallback** — field EN kosong tetap kosong di `/en/...`.

### A4. `CLAUDE.md:50` — carousel hero

Saat ini:

> - Carousel hero Beranda: `HeroStage.tsx` (state, tombol, deskripsi, autoplay, swipe), `HeroPhone.tsx` (satu HP) dan `heroCarouselModel.ts` (logika murni + konstanta waktu), `useHeroAutoplay.ts`. HP **diam**, hanya layar di dalamnya yang bergeser (track 3 layer, `transform` saja) — hero tidak punya `data-story`/`data-story-part` (tanpa GSAP). Batas app `HERO_SHOWCASE_MAX` (`utilities/apps/heroShowcase.ts`, dipakai config Home & `page.tsx`). Durasi/delay CSS `.hero-track` di `globals.css` harus sama dengan `HERO_SLIDE_MS`/`HERO_STAGGER_MS`. Elemen interaktif harus di luar wrapper `aria-hidden` (anchor HP sengaja `aria-hidden` + `tabIndex={-1}`; akses keyboard lewat tautan di deskripsi). Hanya fokus **keyboard** (`:focus-visible`) yang menjeda autoplay. Tes e2e autoplay memakai waktu nyata dan harus berjalan serial (jangan `mode: 'parallel'`).

Usulan:

> - Carousel hero Beranda: `HeroStage.tsx` (state, tombol, swipe), `HeroPhone.tsx` (satu HP), `HeroCaptionCard.tsx` (ikon, nama, deskripsi app di tengah), `HeroProgress.tsx` (segmen indikator per app = tombol), `heroApps.ts` (pemetaan murni app → data hero), `heroCarouselModel.ts` (logika murni + konstanta waktu) dan `useHeroAutoplay.ts` (**hanya** predikat "boleh jalan": hover mouse, fokus keyboard, tab tersembunyi, di luar layar, reduced-motion). HP **diam**, hanya layar di dalamnya yang bergeser (track 3 layer, `transform` saja) — hero tidak punya `data-story`/`data-story-part` (tanpa GSAP). Batas app `HERO_SHOWCASE_MAX` (`utilities/apps/heroShowcase.ts`, dipakai config Home & `page.tsx`). **Satu-satunya jam autoplay** adalah animasi CSS `.hero-progress-fill` (5000ms, `animationend` = satu langkah) — durasinya harus sama dengan `HERO_AUTOPLAY_MS`; durasi/delay `.hero-track` harus sama dengan `HERO_SLIDE_MS`/`HERO_STAGGER_MS` (dikunci `tests/int/heroCssTiming.int.spec.ts`). Tidak ada tombol pause: hover mouse dan fokus **keyboard** (`:focus-visible`) menjeda; langkah manual dengan **sentuh/pena** (tap tombol/segmen atau swipe) menghentikan autoplay untuk sisa kunjungan halaman (WCAG 2.2.2); klik mouse hanya memulai ulang hitungan. Elemen interaktif harus di luar wrapper `aria-hidden` (anchor HP sengaja `aria-hidden` + `tabIndex={-1}`; akses keyboard lewat tautan di deskripsi). Tes e2e autoplay memakai waktu nyata dan harus berjalan serial (jangan `mode: 'parallel'`).

### A5. `CLAUDE.md:110-113` — Multi-bahasa (SEO)

Saat ini:

> **Multi-bahasa (en default, id)**
> - English tanpa prefix (`/apps`), Indonesia berprefix (`/id/apps`); `/en/...` selalu 308 ke versi tanpa prefix. Slug tidak dilokalisasi. Link internal wajib lewat `localizeHref`.
> - Setiap halaman wajib `alternates.languages` untuk `id`, `en`, dan `x-default`, serta `<html lang>` sesuai locale (bukan hardcoded `en`).
> - Konten ID yang belum diisi memakai fallback EN (Payload `fallback: true`); jangan render halaman kosong. Pages/Posts template tidak diterjemahkan → satu canonical (EN). Sitemap memuat kedua locale beserta `hreflang`.

Usulan:

> **Multi-bahasa (id default, en)**
> - Indonesia tanpa prefix (`/apps`), English berprefix (`/en/apps`); `/id/...` selalu 308 ke versi tanpa prefix. Slug tidak dilokalisasi. Link internal wajib lewat `localizeHref`.
> - Setiap halaman wajib `alternates.languages` untuk `id`, `en`, dan `x-default` (= URL tanpa prefix, Indonesia), serta `<html lang>` sesuai locale (bukan hardcoded).
> - Konten ID yang belum diisi memakai fallback EN per field (`fallbackLocales`); English **tidak** punya fallback, jadi app/kategori yang hanya berisi ID harus diisi tab English-nya sebelum terbit (lihat `docs/DEPLOYMENT.md` bagian J). Jangan render halaman kosong. Pages/Posts template tidak diterjemahkan → satu canonical (URL locale default, tanpa prefix). Sitemap memuat kedua locale beserta `hreflang`.

### A6. Butir baru di "Hal yang sering keliru" (setelah `CLAUDE.md:51`)

Usulan (tambahan):

> - Fallback konten per locale diatur `fallbackLocales` di `src/i18n/config.ts` (`{ id: 'en' }`), bukan `fallback: true` global. Urutan `locales` (`['en', 'id']`) **dikunci** oleh enum Postgres `_locales` — mengubah urutan = migrasi skema (diuji `tests/int/i18n-routing.int.spec.ts`); kode yang butuh locale default memakai `defaultLocale`, bukan indeks array.
> - REST/GraphQL Payload **tanpa** `?locale=` tidak menerapkan fallback; konsumen yang butuh cadangan EN mengirim `?locale=id`. Frontend memakai Local API sehingga tidak terdampak.

---

## B. `design/README.md`

Catatan umum: `design/kct-hub.pen` **belum** diperbarui ke palet navy/lime/oranye dan tetap menjadi
sumber kebenaran desain menurut `CLAUDE.md:14`. Pemilik/desainer perlu memperbarui `.pen` (lewat
Pencil) agar desain dan kode kembali sama; sampai saat itu tabel di bawah mencatat nilai **kode**.

### B1. `design/README.md:8` — palet hanya untuk logo

Saat ini:

> Situs bernama **KCT Hub** (sebelumnya KCT Labs). Logo resmi ada di `design/images/brand/kct-hub/` (2 baris & horizontal, varian _Terang_ untuk latar terang dan _Gelap_ untuk latar gelap). Warna logo: navy `#14213D`, krem `#F2F1EE`, oranye `#FF681A`, lime `#CDF228` — **khusus logo**; palet UI situs (token di bawah) tidak berubah.

Usulan:

> Situs bernama **KCT Hub** (sebelumnya KCT Labs). Logo resmi ada di `design/images/brand/kct-hub/` (2 baris & horizontal, varian _Terang_ untuk latar terang dan _Gelap_ untuk latar gelap). Warna logo: navy `#14213D`, krem `#F2F1EE`, oranye `#FF681A`, lime `#CDF228` — kini juga menjadi **dasar palet UI situs** (lihat token di bawah). `design/kct-hub.pen` belum diperbarui ke palet ini; pemilik perlu memperbaruinya di Pencil.

### B2. `design/README.md:40-54` — token desain

Saat ini (`:40`):

> Diturunkan dari brand KCT (navy `#25508F`, sky `#3CBAF9` dari logo) — tidak disamakan dengan kct.co.id. Nuansa "lab" **hanya pada visual/warna** (ink gelap, grid blueprint, aksen sky, lime sebagai indikator status). Copywriting sengaja netral sebagai showcase aplikasi KCT — hindari istilah "eksperimen/lab" di konten. Nama situs: **KCT Hub**.

dan tabel `:42-52` (bg `#070D1A`/`#F4F8FC`, primary `#3CBAF9`/`#1B6FB5`, brand-navy/brand-sky `#25508F`/`#3CBAF9`, …) serta catatan `:54`:

> \* Di kode, `text-muted` digelapkan/diterangkan dari nilai .pen (#6A81A0 / #6A7F96) agar kontras ≥ 4.5:1 (WCAG AA).

Usulan:

> Diturunkan dari logo KCT Hub (navy `#14213D`, krem `#F2F1EE`, lime `#CDF228`, oranye `#FF681A`) — tidak disamakan dengan kct.co.id. Nuansa "lab" **hanya pada visual/warna** (ink navy, grid blueprint, aksen lime/oranye). Copywriting sengaja netral sebagai showcase aplikasi KCT — hindari istilah "eksperimen/lab" di konten. Nama situs: **KCT Hub**. Nilai di bawah adalah nilai **kode** (`src/app/(frontend)/globals.css`); `design/kct-hub.pen` masih memakai palet lama (navy `#25508F`/sky `#3CBAF9`) dan perlu diperbarui pemilik.
>
> | Token                            | Dark                          | Light                         |
> | -------------------------------- | ----------------------------- | ----------------------------- |
> | background                       | #0A1224                       | #F2F1EE                       |
> | bg-raised                        | #0F1A31                       | #FFFFFF                       |
> | surface / surface-2              | #14213D / #1C2C4D             | #FFFFFF / #E8E6E0             |
> | border / border-strong           | #243556 / #3A4D73             | #DCDAD3 / #BDBAB0             |
> | foreground / secondary / muted   | #F2F1EE / #AAB4C8 / #8F9BB5   | #14213D / #43506A / #566175   |
> | primary (+foreground)            | #CDF228 (#0A1224)             | #14213D (#FFFFFF)             |
> | accent-lime                      | #CDF228                       | #3E8A12                       |
> | accent-orange / -text            | #FF681A / #FF681A             | #DD5000 / #B83F00             |
> | warning / danger / success       | #F5C451 / #FF6B6B / #4ADE9A   | #B45309 / #C53030 / #15803D   |
> | brand-navy                       | #14213D                       | sama                          |
> | tint-navy-card / -glow (wash)    | navy 35% / 33%                | navy 10% / 10%                |
>
> Semua pasangan teks ≥ 4.5:1 dan elemen UI ≥ 3:1 di kedua tema (diuji `tests/int/themeTokens.int.spec.ts`, termasuk teks di atas wash navy). Wash navy di tema terang sengaja lebih tipis agar `text-muted` tetap ≥ 4.5:1.

### B3. `design/README.md:67` — field wajib

Saat ini:

> `*` = diterjemahkan; wajib hanya di English (Indonesia fallback ke English).

Usulan:

> `*` = diterjemahkan; wajib hanya di Indonesia (locale default). Field Indonesia yang kosong fallback ke English; English **tidak** fallback ke Indonesia (isi tab English sebelum terbit).

### B4. `design/README.md:76` — batas showcase (sudah usang sebelum branch ini)

Saat ini:

> Tab: Hero (badge, headline, subheadline, 2 CTA, `showcaseApps` maks 3), …

Usulan:

> Tab: Hero (badge, headline, subheadline, 2 CTA, `showcaseApps` maks 8 = `HERO_SHOWCASE_MAX`; app tanpa screenshot terisi dilewati carousel), …

### B5. `design/README.md:87` — URL dokumen legal

Saat ini:

> - URL: `/apps/<app>/legal` (index) dan `/apps/<app>/legal/<doc>` (+ `/id/...`); …

Usulan:

> - URL: `/apps/<app>/legal` (index) dan `/apps/<app>/legal/<doc>` (Indonesia, tanpa prefix; English di `/en/...`); …

### B6. `design/README.md:88` — markdown wajib

Saat ini:

> - Alur admin: buat tipe (sekali) → di Apps › App Documents pilih app + tipe, isi judul & markdown (EN wajib), publish. …

Usulan:

> - Alur admin: buat tipe (sekali) → di Apps › App Documents pilih app + tipe, isi judul & markdown (ID wajib, EN opsional), publish. …

### B7. `design/README.md:89` — fallback dokumen legal

Saat ini:

> - ID opsional: field kosong fallback ke EN. Mengganti slug dokumen yang sudah terbit otomatis membuat redirect 301 (kedua locale).

Usulan:

> - EN opsional. Halaman yang belum punya teks di locale-nya menampilkan teks locale lain dengan pemberitahuan dan `lang` yang benar; canonical & sitemap menunjuk ke locale yang punya teks. Mengganti slug dokumen yang sudah terbit otomatis membuat redirect 301 (kedua locale).

### B8. `design/README.md:93-98` — Multi-bahasa

Saat ini:

> ## Multi-bahasa (English default, Indonesia)
>
> - URL: English tanpa prefix (`/`, `/apps/al-quran-imam`), Indonesia di `/id/...`. `/en/...` → 308 ke versi tanpa prefix. URL lama tetap valid.
> - Payload `localization`: `en` (default) + `id`, `fallback: true`. Hanya field konten KCT yang `localized`; Pages/Posts/Forms/Search tetap non-localized (skema & data lama tidak berubah).
> - String UI: `src/i18n/dictionaries/{en,id}.ts` (paritas key diuji otomatis).
> - SEO: canonical + `hreflang` (`en`, `id`, `x-default`), `<html lang>`, `og:locale`, sitemap `apps-sitemap.xml` per locale.

Usulan:

> ## Multi-bahasa (Indonesia default, English)
>
> - URL: Indonesia tanpa prefix (`/`, `/apps/al-quran-imam`), English di `/en/...`. `/id/...` → 308 ke versi tanpa prefix (query ikut). Sejak rilis "locale default ID" URL tanpa prefix berbahasa Indonesia (lihat `docs/DEPLOYMENT.md` bagian J).
> - Payload `localization`: `id` (default) + `en`, fallback per field hanya `id → en` (`fallbackLocales`). Urutan `locales` tetap `['en', 'id']` (enum Postgres). Hanya field konten KCT yang `localized`; Pages/Posts/Forms/Search tetap non-localized (skema & data lama tidak berubah).
> - String UI: `src/i18n/dictionaries/{en,id}.ts` (paritas key diuji otomatis).
> - SEO: canonical + `hreflang` (`id`, `en`, `x-default` = Indonesia), `<html lang>`, `og:locale`, sitemap `apps-sitemap.xml` per locale.

### B9. `design/README.md:130` — asumsi yang dikonfirmasi

Saat ini:

> - Bahasa default English (tanpa prefix), Indonesia di `/id` (dikonfirmasi).

Usulan:

> - Bahasa default Indonesia (tanpa prefix), English di `/en` (dikonfirmasi pemilik, rilis "locale default ID"; sebelumnya English default).
