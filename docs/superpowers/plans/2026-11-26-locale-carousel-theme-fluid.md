# Locale ID, Carousel per-App, Tema Logo, Fluid, Hero Statis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KCT Hub berbahasa Indonesia secara default, hero menampilkan satu app penuh (3 screenshot) per slide dengan kartu deskripsi + indikator waktu, tema mengikuti warna logo, hero statis, dan seluruh halaman publik tidak terpotong di berbagai ukuran layar.

**Architecture:** Enam perubahan berurutan, masing-masing diverifikasi sendiri. Carousel tetap arsitektur "HP diam, layar bergeser"; indikator berupa animasi CSS yang `animationend`-nya menggerakkan slide berikutnya (satu sumber waktu, jeda otomatis membekukan keduanya). Locale: `defaultLocale` berpindah ke `id` dengan `fallbackLocale` `id → en`; utilitas URL/SEO sudah generik terhadap `defaultLocale`.

**Tech Stack:** Next.js 16 (App Router), React 19, Payload CMS 3 (Postgres), Tailwind v4, GSAP (hanya section lain), Vitest (`tests/int`), Playwright (`tests/e2e`), pnpm.

**Spec:** `docs/superpowers/specs/2026-11-26-locale-carousel-theme-fluid-design.md`

## Global Constraints

- Jangan ubah business logic query app, hook, access control; tidak ada field/koleksi baru, **tidak ada migrasi data**; tidak ada dependensi baru.
- Komponen memakai token CSS dari `globals.css`; **tanpa hex hardcoded dan tanpa inline style** di komponen (CLAUDE.md).
- Nama situs dari `SITE_NAME` (`src/utilities/seo/constants.ts`); jangan tulis "KCT Labs"; jangan pakai istilah "eksperimen/laboratorium" di teks.
- Hex logo (sumber: `public/brand/*.png`): lime `#CDF228`, oranye `#FF681A`, navy `#14213D`, putih tulang `#F2F1EE`.
- Kontras: teks ≥ 4,5:1, elemen UI ≥ 3:1, di kedua tema.
- Autoplay `HERO_AUTOPLAY_MS = 5000`; `HERO_SHOWCASE_MAX = 8`; maks 3 screenshot per app.
- URL: ID tanpa prefix; `/en/...` English; `/id/...` → 308 ke `/...`; `x-default` → ID.
- Tes tidak boleh dihapus/dilemahkan: tes yang perilakunya sengaja berubah diganti dengan assertion perilaku baru.
- **Commit:** hanya jika pemilik meminta (CLAUDE.md); pesan commit tanpa atribusi AI. Langkah "Checkpoint" di bawah = jalankan gerbang verifikasi, bukan commit.
- Sebelum menjalankan `pnpm payload migrate*`, `pnpm seed:kct`, atau mengubah `CLAUDE.md`/`design/README.md`: minta konfirmasi pemilik.
- Gerbang verifikasi per task: `pnpm exec tsc --noEmit`, `pnpm lint`, tes int/e2e task tersebut. Akhir proyek: `pnpm build` dan `pnpm test`.

## Review Focus

1. **App tanpa/beda jumlah screenshot** (0, 1, 2, 3, 10) bersebelahan di showcase: tidak crash, jumlah HP = jumlah screenshot app aktif (maks 3), tidak ada layout shift. (Task 3, 4)
2. **Jeda lalu lanjut:** hover/fokus keyboard/tab tersembunyi/di luar layar membekukan isian dan melanjutkannya (bukan mengulang dari nol); satu isian penuh = tepat satu slide, tidak ganda. (Task 4)
3. **Hanya 1 app layak** (yang lain tanpa screenshot) atau 0: tanpa segmen/panah/autoplay; 0 → hero tanpa HP, halaman tetap utuh. (Task 3, 4)
4. **Viewport kecil/zoom** (mis. 1280×720 pada zoom 150% ≈ 853×480, 390×844): tanpa scroll horizontal, tanpa konten hero terpotong. (Task 5)
5. **Redirect/prefix:** `/id/apps?sort=name` → `/apps?sort=name` (query terjaga); path yang hanya *diawali* huruf `id`/`en` (mis. `/identity`, `/enter`) bukan locale; app EN-only tampil di `/apps/<slug>` memakai teks EN, bukan kosong. (Task 6)
6. **Tema:** tiga salinan token gelap (`[data-theme='dark']`, blok `prefers-color-scheme` tanpa `data-theme`) harus identik; sisa pemakai `--brand-sky`/`--brand-navy` tidak jadi biru "yatim". (Task 1)

---

### Task 1: Tema warna logo

**Files:**
- Modify: `src/app/(frontend)/globals.css` (`:root` ±98–154, `[data-theme='dark']` ±157–188, blok `@media (prefers-color-scheme: dark)` ±191–223, `@theme` ±227–270)
- Modify: pemakai `--brand-sky`/`--brand-navy` (`HomeHero.tsx:57,62`, `HomeSections.tsx:55,321,325`, `HomeCatalog.tsx:103`, `apps/(list)/page.tsx:100`, `apps/[slug]/page.tsx:131`, `apps/[slug]/legal/page.tsx:84`, `apps/[slug]/legal/[doc]/page.tsx:134`)
- Test: `tests/int/themeTokens.int.spec.ts` (baru)

**Interfaces:**
- Produces: token baru `--accent-orange` (isi/UI, oranye logo) dan `--accent-orange-text` (teks kecil, lolos 4,5:1 di atas `--background`/`--surface` tema terkait), diekspos sebagai `--color-accent-orange`, `--color-accent-orange-text` di `@theme`. `--primary` terang = navy `#14213D` (`--primary-foreground` putih); gelap = lime `#CDF228` (`--primary-foreground` gelap). `--ring`, `--chart-1`, `--sidebar-primary` mengikuti.

- [ ] **Step 1: Tes gagal.** `themeTokens.int.spec.ts` membaca `globals.css` (fs) dan mengekstrak token per blok. Helper `contrast(fgHex, bgHex): number` (rumus WCAG). Test: `'light: primary-foreground on primary >= 4.5'`, `'dark: …'`, `'foreground on background >= 4.5 (both)'`, `'text-secondary and text-muted on background >= 4.5 (both)'`, `'accent-orange-text on background and surface >= 4.5 (both)'`, `'accent-orange on background >= 3 (both)'`, `'light primary is #14213d and dark primary is #cdf228'`, `'the prefers-color-scheme block repeats every [data-theme=dark] token with the same value'`.
- [ ] **Step 2:** `pnpm exec vitest run --config ./vitest.config.mts tests/int/themeTokens.int.spec.ts` → FAIL (token/primary lama).
- [ ] **Step 3: Ubah token** di tiga blok + `@theme`. Latar terang diturunkan dari `#F2F1EE`/putih; latar gelap tetap keluarga navy gelap yang selaras logo (nilai persis: keputusan builder, harus lulus tes). `--accent-orange-text` terang = oranye lebih gelap dari `#FF681A` hingga lolos 4,5:1; gelap boleh `#FF681A`. `--accent-lime*` dipertahankan untuk badge/titik.
- [ ] **Step 4: Selaraskan pemakai** `--brand-sky`/`--brand-navy`: ganti glow/gradien biru menjadi turunan `--accent-orange`/`--primary` via `color-mix` (tetap token). `bg-brand-navy` CTA di `HomeSections.tsx:321` tetap navy logo (cek teks di atasnya ≥ 4,5:1 di kedua tema). Audit fokus ring, link, chip status, `StatusChip`, `ButtonLink` memakai `--primary` → tetap terbaca.
- [ ] **Step 5:** tes Step 2 → PASS. Lalu `pnpm exec tsc --noEmit`, `pnpm lint`.
- [ ] **Step 6: Verifikasi visual** (preview dev): Beranda, `/apps`, detail app di terang & gelap (screenshot dibandingkan dengan acuan pemilik: tombol utama navy/lime, aksen oranye). Laporkan selisih dengan `design/kct-hub.pen`, jangan ubah `.pen`.
- [ ] **Step 7: Checkpoint.** Gerbang verifikasi lulus.

---

### Task 2: Hero statis (hapus GSAP hanya di hero)

**Files:**
- Modify: `src/components/home/scrollStory.ts` (hapus `buildHero` ±38–67 dan panggilannya di ±246), `src/components/home/HomeHero.tsx`, `src/components/home/HeroPhone.tsx`, `src/app/(frontend)/globals.css` (±600–603 aturan `will-change` untuk `phone-*`, `*-glow-a/b` milik hero)
- Modify: `src/components/home/scrollStoryConfig.ts` (pertahankan `PhoneSlot`/`phoneSlot` — masih dipakai CSS `.hero-track[data-slot]`; hapus hanya yang tak terpakai)
- Test: `tests/e2e/home-scroll-story.e2e.spec.ts`, `tests/e2e/home-hero-carousel.e2e.spec.ts:157` (tes "GSAP part nodes … still present"), `tests/int/scrollStory.int.spec.ts`

**Interfaces:**
- Produces: hero = `<section aria-labelledby="hero-title">` biasa — tanpa `data-story`, `data-story-track`, `.story-pin`, `.story-spacer`, `data-story-part` apa pun. Section `featured/process/about/cta` tidak berubah.

- [ ] **Step 1: Ganti tes.** Di `home-scroll-story.e2e.spec.ts` ganti `'hero sticks below the header and scrubs both ways'` dengan `'hero is static: not sticky, no story parts, scrolls away normally'` (assert: `getComputedStyle(hero).position !== 'sticky'`; `hero.querySelectorAll('[data-story-part]').length === 0`; setelah scroll 600px posisi atas hero bergerak 600px ±1). Ganti tes carousel `:157` dengan `'the hero phones carry no scroll-story part nodes'`. Tes `no layout shift when the story starts` untuk hero tetap (CLS ≤ 0,1).
- [ ] **Step 2:** jalankan dua berkas e2e → FAIL (assertion baru).
- [ ] **Step 3: Implementasi.** Hapus `buildHero` + pemanggilnya; `HomeHero.tsx`: hapus `story-pin`, `data-story`, `data-story-part` (hero-copy, glow-a/b), pembungkus `data-story-track` dan `story-spacer` (selalu `return section`); `HeroPhone.tsx`: hapus atribut `data-story-part={`phone-${slot}`}` (div pembungkus boleh tetap tanpa atribut). Pose HP tetap via class statis di `STAGE` (`HeroStage.tsx`) — tampilan awal tidak berubah.
- [ ] **Step 4:** perbarui `scrollStory.int.spec.ts` bila ada assertion hero; jalankan tes int + e2e berkas di Step 1 + `home-scroll-story` penuh → PASS (section lain tetap hijau).
- [ ] **Step 5: Dokumentasi** (setelah konfirmasi pemilik): perbarui butir "Scroll story Beranda" dan "Carousel hero" di `CLAUDE.md`, dan bagian scroll story di `design/README.md`: hero tidak lagi dianimasikan GSAP.
- [ ] **Step 6: Checkpoint.**

---

### Task 3: Carousel — model dan data (tanpa UI)

**Files:**
- Modify: `src/components/home/heroCarouselModel.ts`, `src/components/home/HomeHero.tsx` (pemetaan `HeroApp`), `src/components/home/HeroStage.tsx` (hanya tipe `HeroApp`), `src/app/(frontend)/[locale]/page.tsx` (hanya jika tipe `ShowcaseApp` perlu `icon`)
- Test: `tests/int/heroCarouselModel.int.spec.ts`, `tests/int/heroShowcase.int.spec.ts`

**Interfaces:**
- Produces (heroCarouselModel.ts):
  - `export const HERO_MAX_SCREENS = 3`
  - `export const screenIndexes = (shotCount: number): number[]` — indeks screenshot per posisi panggung `[kiri, tengah, kanan]`: `0→[]`, `1→[0]`, `2→[1,0]`, `≥3→[1,0,2]` (tengah selalu screenshot 1).
  - `export const hasScreens = (app: { screens: readonly unknown[] }): boolean`
  - Hapus `stageAppIndexes` dan `layerWindow` jika tak terpakai setelah Task 4 (jangan hapus sebelum Task 4 selesai).
- Produces (HeroStage.tsx): `export type HeroApp = { id: number; name: string; href: string; shortDescription: string | null; screens: ImageSource[]; icon: Pick<Media, 'url' | 'updatedAt' | 'width' | 'height' | 'alt'> | null }` (`screens` ≤ 3; `image` dihapus).
- Consumes: `toImageSource`, `isMedia` (`components/site/media.ts`), `normalizeShowcase`.

- [ ] **Step 1: Tes gagal** (`heroCarouselModel.int.spec.ts`): `'screenIndexes handles 0, 1, 2, 3 and 10 screenshots'` (assert `[]`, `[0]`, `[1,0]`, `[1,0,2]`, `[1,0,2]`); `'hasScreens is false for an empty list'`. `heroShowcase.int.spec.ts`: `'maps at most 3 screens per app, skips non-populated uploads'` terhadap fungsi pemetaan yang diekstrak (lihat Step 3).
- [ ] **Step 2:** `pnpm exec vitest run --config ./vitest.config.mts tests/int/heroCarouselModel.int.spec.ts tests/int/heroShowcase.int.spec.ts` → FAIL.
- [ ] **Step 3: Implementasi.** Ekstrak `toHeroApp(app: ShowcaseApp, locale, dict): HeroApp` (file `src/components/home/heroApps.ts`, murni): `screens` = `app.screenshots` difilter `isMedia`, `slice(0, HERO_MAX_SCREENS)`, tiap item `toImageSource(m, format(dict.app.screenshotAlt, { name, index: i + 1 }))`; `icon` = field `icon` bila `isMedia`. `HomeHero` memakai `showcase.map(...).filter(hasScreens)`; `hasPhones = apps.length > 0`. `ShowcaseApp` ditambah `'icon'` pada `Pick<App,…>` (field sudah di `defaultPopulate`; tanpa query baru).
- [ ] **Step 4:** tes Step 2 → PASS; `tsc` boleh gagal sementara di `HeroStage/HeroPhone` (diperbaiki Task 4) — kerjakan Task 4 berurutan tanpa checkpoint di antaranya.

---

### Task 4: Carousel — UI (tiga screenshot, kartu, indikator, tanpa play/pause)

**Files:**
- Modify: `src/components/home/HeroStage.tsx`, `src/components/home/HeroPhone.tsx`, `src/components/home/useHeroAutoplay.ts`, `src/components/home/heroCarouselModel.ts`, `src/app/(frontend)/globals.css` (±630–680), `src/i18n/dictionaries/en.ts:107-111`, `src/i18n/dictionaries/id.ts:105-109`, `src/components/home/HomeHero.tsx` (label)
- Create: `src/components/home/HeroCaptionCard.tsx`, `src/components/home/HeroProgress.tsx`
- Test: `tests/int/heroStage.int.spec.ts`, `tests/int/heroCarouselModel.int.spec.ts`, `tests/e2e/home-hero-carousel.e2e.spec.ts`

**Interfaces:**
- Produces: `HeroProgress: React.FC<{ count: number; active: number; running: boolean; labels: string[]; onSelect: (index: number) => void; onComplete: () => void }>` — satu `<button type="button" aria-label aria-current>` per app dalam `<div role="group">`; segmen aktif memuat `<span className="hero-progress-fill" data-running data-testid="hero-progress-fill" key={active}>` dengan `onAnimationEnd={onComplete}`.
- Produces: `HeroCaptionCard: React.FC<{ app: HeroApp; animate: boolean }>` — kartu bergaris: `AppIcon` (size 56) + pemisah vertikal + `Link` nama (`line-clamp-1`) + deskripsi (`line-clamp-3`), tinggi terkunci (tanpa CLS).
- Produces: kamus `home.heroGoTo` (EN `'Show {name}'`, ID `'Tampilkan {name}'`, dipakai via `format`); **hapus** `heroPause`, `heroPlay` dari kedua kamus dan dari `HeroLabels`.
- `useHeroAutoplay` mengembalikan `{ running }` saja (timer `setTimeout` dihapus; waktu sepenuhnya dari animasi CSS). Parameter `userPaused`, `resetKey`, `onTick` dihapus.
- CSS: `.hero-progress-fill { animation: hero-progress 5000ms linear forwards; transform-origin: left; }`, `[data-running='false'] { animation-play-state: paused }`, `@keyframes hero-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }`; komentar "KEEP IN SYNC dengan `HERO_AUTOPLAY_MS`" (pola yang sama dengan `HERO_SLIDE_MS`). Reduced-motion: `running=false` dan segmen aktif tampil penuh (statis). Warna isian `bg-accent-orange`; segmen lain titik `bg-border-strong`.

- [ ] **Step 1: Tes gagal (int, `heroStage.int.spec.ts`)** — perbarui/ganti: `'renders three phones with screenshots 2, 1, 3 of the same app (left, centre, right)'`; `'renders one centred phone for a one-screenshot app and two for a two-screenshot app'`; `'has no pause/play button'` (`queryByLabelText` null); `'renders one progress segment per app, the first marked aria-current'`; `'fires one step when the active fill animation ends (fireEvent.animationEnd)'`; `'stops filling (data-running=false) while hovered and keeps the same segment'`; `'clicking segment N shows app N'`; `'a single app renders no segments, no arrows and no fill'`. Tes e2e: ganti `'the pause button stops and restarts it'` dengan `'there is no pause button and hover freezes the fill instead of resetting it'` (ukur `getBoundingClientRect().width` fill sebelum/sesudah hover 1 dtk: tidak berubah ±2px; setelah keluar bertambah); `'advances by itself about every five seconds'` tetap; tambahkan `'three phones belong to one app (alt text names the same app)'`.
- [ ] **Step 2:** jalankan `heroStage.int.spec.ts` → FAIL.
- [ ] **Step 3: HeroPhone.** Setiap HP menampilkan screenshot milik posisinya: layer prev/cur/next berasal dari app tetangga pada indeks screenshot posisi yang sama (`screens[screenIndexes(n)[position]]`, `null` → layar kosong `bg-surface-2`). Jumlah HP = `screenIndexes(activeApp.screens.length).length`. `priority` hanya screenshot-1 app layak pertama di tengah; sisanya aturan lama (neighbour setelah idle). Slot yang tak ada di app tetangga meluncur sebagai layar kosong lalu HP diganti saat commit (perilaku sederhana, ditutup tes di Review Focus 1).
- [ ] **Step 4: HeroStage.** Hapus `userPaused`, tombol play/pause, `Pause/Play` import; caption → `HeroCaptionCard` (di bawah tengah, di atas indikator); indikator `HeroProgress` di bawah kartu; `onComplete` → `go('next')`; `onSelect(i)` → lompat ke app `i` tanpa animasi geser berantai (set `active`, `changed=true`; hormati `animating`). Tombol prev/next dan swipe dipertahankan. `labels` memakai `heroGoTo` per app.
- [ ] **Step 5:** `useHeroAutoplay` disederhanakan (hapus timer); `isAutoplayRunning` tetap dipakai, tanpa `userPaused` (`AutoplayState`/tesnya diperbarui).
- [ ] **Step 6:** tes int Step 1 + `heroCarouselModel` → PASS; hapus `stageAppIndexes`/`layerWindow` bila tak ada pemakai (atau sesuaikan tesnya); `tsc` + `lint`.
- [ ] **Step 7:** `pnpm test:e2e tests/e2e/home-hero-carousel.e2e.spec.ts` → PASS (autoplay serial; jangan `mode: 'parallel'`). Tes swipe/reduced-motion/hidden-tab disesuaikan dengan perilaku baru, bukan dihapus.
- [ ] **Step 8: Verifikasi visual + SEO:** satu `<h1>`, kartu terlihat seperti screenshot acuan, segmen terisi oranye; view-source: nama/deskripsi app aktif ada di HTML SSR.
- [ ] **Step 9: Checkpoint.**

---

### Task 5: Ukuran fluid di seluruh halaman publik

**Files:**
- Modify: `src/app/(frontend)/globals.css` (`.site-container` ±303–320, token fluid baru di `@theme`/`:root`), `src/components/home/HomeHero.tsx`, `src/components/home/HeroStage.tsx`, `src/components/home/HomeSections.tsx`, `src/components/home/HomeCatalog.tsx`, `src/components/apps/ScreenshotGallery.tsx`, `src/components/quick-view/QuickViewDialog.tsx`, `src/components/site/AppIcon.tsx` (hanya jika perlu), halaman `src/app/(frontend)/[locale]/**` (daftar app, detail app, legal, pencarian, Pages/Posts) bila memakai `max-w-[…px]`/`h-[…px]` tetap
- Test: `tests/e2e/fluid-layout.e2e.spec.ts` (baru)

**Interfaces:**
- Produces token (di `globals.css`): `--container-max` (`clamp(85rem, …, 100rem)`, naik hingga ±1600px di layar lebar), `--section-y`, `--space-gutter`, `--text-display`, `--text-title` (semua `clamp()`), dan `--hero-stage-h: clamp(26rem, calc(100svh - var(--story-top) - 9rem), 46.75rem)` (maks setara 748px), dipakai `HeroStage` untuk tinggi stage; lebar HP mengikuti tinggi (`aspect-[260/540]`).
- Hero tidak `overflow-hidden` pada sumbu-Y untuk konten (hanya elemen dekoratif `pointer-events-none` yang di-clip; gunakan `overflow-x: clip` pada section).

- [ ] **Step 1: Tes gagal** `fluid-layout.e2e.spec.ts`: untuk setiap viewport di `[1280×720, 1366×768, 1440×900, 1536×864, 1920×1080, 2560×1440, 768×1024, 390×844, 853×480]` dan route `['/', '/apps', '/apps/<slug app seed pertama>', '/apps/<slug>/legal']` assert: `document.documentElement.scrollWidth <= window.innerWidth`; pada `/`: setiap elemen non-dekoratif (bukan `.pointer-events-none`) di dalam `section[aria-labelledby=hero-title]` memiliki `getBoundingClientRect()` yang berada di dalam rect section (tidak terpotong), dan `[data-hero-carousel]` `right <= innerWidth`; `<h1>` tepat satu. Tes `'fluid headline stays within 2 lines…'` tidak perlu. Sertakan tes CLS ≤ 0,1 di 1440×900.
- [ ] **Step 2:** `pnpm test:e2e tests/e2e/fluid-layout.e2e.spec.ts` → FAIL (setidaknya 1366×768 dan 853×480).
- [ ] **Step 3: Implementasi token + container**, lalu ganti ukuran tetap hero (`lg:h-[748px]`, `lg:max-w-[700px]`, `lg:grid-cols-[600px_1fr]`, `lg:text-[64px]`, `pt-[72px]`) dengan token/`clamp()`; kolom teks `minmax(0, 38rem)`. Telusuri ±24 kemunculan ukuran px di `src/components` dan halaman; ganti hanya yang menyebabkan potong/overflow, tanpa mengubah markup halaman non-hero.
- [ ] **Step 4:** tes Step 2 → PASS. Jalankan juga `home-scroll-story` (section `featured` tetap lolos; cek `PIN_QUERY` ↔ CSS `.story-pin` tetap sama) dan `quick-view` e2e.
- [ ] **Step 5: Lighthouse** mobile pada Beranda: Performance ≥ 90, Accessibility/SEO ≥ 95 (laporkan angka).
- [ ] **Step 6: Checkpoint.**

---

### Task 6: Locale default Indonesia

**Files:**
- Modify: `src/i18n/config.ts` (`defaultLocale`, komentar, urutan `locales`, `fallbackLocales`), `src/payload.config.ts:100-104`, `src/i18n/routing.ts` (hanya komentar), `src/endpoints/seed/kct/index.ts` (`LOCALES` dengan `defaultLocale` lebih dulu; `locale: 'en'` pada ±166 → `defaultLocale`), `src/collections/AppDocuments/components/LocaleFallbackBanner.tsx` (teks sumber ID), `docs/DEPLOYMENT.md`
- Audit tiap pemakai `defaultLocale`/literal `'en'`: `src/app/(frontend)/[locale]/{layout,not-found}.tsx`, `apps/error.tsx`, `apps/[slug]/legal/[doc]/page.tsx`, `collections/{AppCategories,AppDocuments,Apps,DocumentTypes}/index.ts`, `components/site/LoadingLabel.tsx`, `Footer/config.ts`, `globals/Home/config.ts`, `utilities/{apps/appPath,apps/quickView,apps/validation,generateMeta,seo/sitemap,seo/structuredData,seo/urls}.ts` — literal `'en'` yang berarti "bahasa default" → `defaultLocale`; yang berarti English → tetap. **Jangan edit** `src/migrations/*`.
- Test: `tests/int/i18n-routing.int.spec.ts`, `tests/int/seo.int.spec.ts`, `tests/int/apps.int.spec.ts` (fallback), `tests/int/legal-queries.int.spec.ts`, e2e: `frontend`, `kct-hub`, `legal`, `quick-view`, `home-hero-carousel`

**Interfaces:**
- Produces: `export const defaultLocale: Locale = 'id'`; `export const locales = ['id', 'en'] as const`; `export const fallbackLocales: Partial<Record<Locale, Locale>> = { id: 'en' }`. Payload `localization.locales` = `locales.map((code) => ({ code, label: localeLabels[code], fallbackLocale: fallbackLocales[code] }))`, `defaultLocale`, `fallback: true`.

- [ ] **Step 1: Tes gagal (int).** `i18n-routing`: `'/apps rewrites to /id/apps'`, `'/ rewrites to /id'`, `'/id/apps redirects 308 to /apps and keeps ?sort=name'`, `'/en/apps is served as-is'`, `'/identity and /enter are not treated as locales'`, `localizeHref('/apps','id') === '/apps'`, `localizeHref('/apps','en') === '/en/apps'`, `stripLocale('/id/apps') === '/apps'`. `seo.int`: canonical/hreflang untuk `/apps` (id), `/en/apps` (en), `x-default` = versi tanpa prefix; sitemap memuat kedua locale. `apps.int`: `'id empty field falls back to en per field'` (title ID ada, description ID kosong → description EN) dan `'en does not fall back to id'` — **jika Payload tidak bisa mematikan fallback `en → id` (baca `node_modules/payload/dist/fields/hooks/afterRead/promise.js` dan tipe `fallbackLocale`), BERHENTI dan laporkan ke pemilik, jangan ubah diam-diam.**
- [ ] **Step 2:** `pnpm exec vitest run --config ./vitest.config.mts tests/int/i18n-routing.int.spec.ts tests/int/seo.int.spec.ts tests/int/apps.int.spec.ts` → FAIL.
- [ ] **Step 3: Implementasi** `config.ts` + `payload.config.ts`; audit daftar pemakai satu per satu (Files di atas); `LocaleFallbackBanner`: bahasa sumber = default (ID), copy disesuaikan. Dokumen legal: tetap `fallbackLocale: false` (`utilities/legal/queries.ts`).
- [ ] **Step 4: Seed/rebrand.** `seed-kct`: loop `LOCALES` memulai dari `defaultLocale` (create di ID, update EN). `scripts/rebrand-content.ts` membaca per locale tanpa fallback — pastikan tetap benar (tes `rebrand.int.spec.ts` hijau). Jangan jalankan `pnpm seed:kct` tanpa konfirmasi pemilik.
- [ ] **Step 5:** tes Step 2 + `legal-queries`, `legal-validation`, `rebrand`, `apps-utils` → PASS.
- [ ] **Step 6: Perbarui e2e** yang mengasumsikan `/`=EN dan `/id/…`=ID: cari `rg "'/id|\"/id|/id/|locale: 'en'|toHaveURL" tests/e2e` dan balik (ID tanpa prefix, EN `/en/…`); tes hero carousel "phone links keep the locale prefix in Indonesian" jadi "…in English". Tambah e2e SEO: `<html lang="id">` di `/`, `lang="en"` di `/en`, satu `<h1>`, canonical/hreflang, JSON-LD valid, `/id/apps` → 308 `/apps`, `/en` memuat English, app EN-only di `/apps/<slug>` tampil teks EN.
- [ ] **Step 7:** `pnpm test:e2e` (berkas satu per satu) → PASS.
- [ ] **Step 8: Bukti tanpa migrasi (butuh konfirmasi pemilik):** jalankan `pnpm payload migrate:create locale_default_id` pada DB dev dan pastikan hasilnya **tanpa perubahan skema** (hapus berkas bila kosong). Bila ada diff, BERHENTI dan laporkan.
- [ ] **Step 9: `docs/DEPLOYMENT.md`:** bagian "Perubahan default locale": urutan rilis (deploy → `POST /api/apps/revalidate` → kirim ulang sitemap), 308 `/id/*`, konsekuensi admin (dokumen EN-only tidak bisa disimpan di tab ID sampai field ID diisi), cara rollback (`defaultLocale` kembali `'en'`).
- [ ] **Step 10: Checkpoint akhir.** `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm exec prettier --check .`, `pnpm build`, `pnpm test`; checklist SEO CLAUDE.md (view-source: title, description, canonical, OG, hreflang; JSON-LD; sitemap & robots; 404/308 benar).

---

## Self-Review

- **Cakupan spec:** 1 Locale → Task 6; 2–4 Carousel/kartu/indikator → Task 3–4; 5 Fluid → Task 5; 6 Tema → Task 1; 7 Hero statis → Task 2. Keputusan builder-check (fallback, validator, seed, `/en`, edge carousel, viewport pendek, oranye, `.pen`) ada di Task terkait.
- **Urutan menyimpang dari spec:** carousel (Task 3–4) dikerjakan **sebelum** fluid (Task 5) karena keduanya menyentuh tata letak `HeroStage`; fluid menetapkan tinggi stage sekali. Spec bagian "Urutan kerja" diperbarui.
- **Konsistensi tipe:** `HeroApp.screens: ImageSource[]` (Task 3) dipakai Task 4; `screenIndexes`, `HERO_MAX_SCREENS`, `fallbackLocales`, `--accent-orange(-text)`, `--hero-stage-h` didefinisikan di task producernya dan hanya dipakai setelahnya.
- **Risiko terbuka (butuh pemilik, bukan tebakan):** Payload mungkin tak bisa mematikan fallback `en → id` (Task 6 Step 1); `migrate:create` perlu persetujuan (Step 8); pembaruan `CLAUDE.md`/`design/README.md` (Task 2 Step 5).
