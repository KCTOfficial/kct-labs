# Hero fluid + halaman detail app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kartu deskripsi hero Beranda berskala seimbang terhadap tiga HP di semua viewport desktop, dan halaman detail app mengikuti `design/app-detail.png` dengan bagian baru yang dikelola di admin (picker ikon popup, warna aksen preset).

**Architecture:** T1 hanya CSS/komponen hero (token turunan dari `--hero-stage-h`/`--hero-phones-w` yang sudah ada). T2 menambah field opsional aditif di `Apps`, satu registry ikon sumber-tunggal (`appIconNames`) dengan picker admin, preset warna aksen sebagai atribut `data-accent` → token CSS, dan komponen server per bagian yang disusun oleh `page.tsx`; bagian kosong tidak dirender.

**Tech Stack:** Next.js 16 (RSC), React 19, Payload 3.93 (`@payloadcms/ui` Modal), Tailwind v4 (token CSS), `lucide-react` 0.563 (sudah terpasang), Vitest (jsdom + DB nyata), Playwright. Tanpa dependensi baru.

**Spec:** `docs/superpowers/specs/2026-11-26-hero-fluid-app-detail-design.md` (baseline kode = `origin/master` `ba572f2`).

## Global Constraints

- Jangan ubah business logic, hasil data, URL/slug, JSON-LD, metadata SEO, quick-view, listing, halaman legal, header/footer, carousel (autoplay/swipe/tombol), `HeroPhone`/`heroCarouselModel`/`useHeroAutoplay`/`HeroProgress`.
- Tidak ada dependensi baru (Font Awesome/Feather tidak dipasang; Lucide cukup).
- Komponen publik: hanya token CSS (tanpa hex, tanpa inline style). Hex hanya di `globals.css` dan satu modul konstanta `accent.ts` (dipakai admin untuk kotak warna; disinkronkan tes dengan `globals.css`).
- Kontras: teks ≥ 4,5:1, UI/ikon besar ≥ 3:1, kedua tema, termasuk blok `prefers-color-scheme` yang duplikat di `globals.css`.
- Field baru **semua opsional**, aditif, teks terlokalisasi (`localized: true`) kecuali `icon`/`accentColor` (`localized: false`); `requiredInDefaultLocale(defaultLocale)` hanya di dalam baris yang ada; tidak ada hardcode `'id'`/`'en'`.
- Batas: `highlights` maks 3 (`title` ≤ 40, `description` ≤ 60); `howItWorks.steps` maks 4 (`title` ≤ 60, `description` ≤ 140); `features` maks 12 (tetap), `features[].description` ≤ 80; `accentColor` 12 preset: `blue sky cyan teal green lime amber orange red rose pink purple`.
- Ikon: `type: 'text'` + `validate` daftar putih, **bukan** `select` (tanpa enum DB); daftar **append-only**; 20 nama di `src/fields/iconSelect.ts` (Home) **tidak berubah** (Home tetap `select`, tanpa migrasi). Peta ikon (`iconMap.ts`) hanya diimpor Server Component dan admin picker, tidak oleh Client Component publik.
- Satu `<h1>` per halaman; bagian baru `<h2>`; konten penting di HTML SSR.
- `src/payload-types.ts` dan `src/app/(payload)/admin/importMap.js` **generated** (`pnpm generate:types`, `pnpm generate:importmap`), tidak diedit manual. Local API dengan `user` memakai `overrideAccess: false`.
- **Wajib konfirmasi pemilik sebelum:** membuat branch, `pnpm payload migrate:create`, menjalankan migrasi / membuat DB sementara, menjalankan seed (`pnpm seed:kct`), mengubah `CLAUDE.md`, commit/push. Commit hanya atas permintaan; format `tipe: deskripsi`, **tanpa atribusi AI**. Worktree ini punya perubahan `CLAUDE.md` milik pemilik (jangan disentuh/di-stage).
- Tes yang ada tidak dihapus/dilemahkan. Bahasa UI/komentar mengikuti konvensi repo (komentar menjelaskan *mengapa*).

## Review Focus

1. App lama tanpa satu pun field baru (`null`/`[]`/grup kosong) → halaman detail tetap utuh: tanpa heading yatim, tanpa strip/section kosong, `description`/legal/galeri/spec tetap ada. (Task 6)
2. Ikon/preset di luar daftar (data lama, API langsung) → render fallback tanpa crash, simpan baru ditolak. (Tasks 2, 4, 5)
3. Teks panjang/emoji/tanpa spasi di highlight, langkah, fitur, banner → tidak merusak layout (`break-words`, `line-clamp`). (Task 6)
4. Seed dijalankan ulang setelah editor mengubah ikon/teks/urutan fitur → tidak menimpa (ikon/deskripsi editor bertahan). (Task 7)
5. Screenshot 0/1/2/≥4, gambar langkah terhapus (relasi `null`), kategori kosong, ID tanpa terjemahan (fallback EN per field). (Tasks 5, 6)

---

### Task 0: Branch dan baseline hijau

**Files:** tidak ada perubahan kode.

- [ ] **Step 1: Minta konfirmasi pemilik** untuk membuat branch `feat/hero-fluid-app-detail` dari `origin/master` (`ba572f2`) di worktree ini (HEAD sekarang `e8bf0ca` pada `fix/deploy-smoke-locale`, satu merge di belakang `origin/master`). Setelah disetujui: `git switch -c feat/hero-fluid-app-detail origin/master` (perubahan `CLAUDE.md` yang belum di-commit ikut terbawa; jangan di-stage).
- [ ] **Step 2: Catat baseline.** Run: `pnpm exec tsc --noEmit` lalu `pnpm test:int`. Expected: keduanya lulus (catat jumlah tes). Jika ada yang gagal, laporkan dan berhenti.
- [ ] **Step 3: Pastikan dev server hidup** di `:3000` dari worktree ini (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200`). Jika tidak, `pnpm dev` (background). Playwright memakainya (`reuseExistingServer`).

---

### Task 1: Kartu deskripsi hero berskala (T1)

**Files:**
- Modify: `src/app/(frontend)/globals.css` (blok `:root` fluid, sekitar `--hero-phones-w`)
- Modify: `src/components/home/HeroCaptionCard.tsx`
- Modify: `src/components/home/HeroStage.tsx` (root `lg:w-[max(var(--hero-phones-w),29rem)]`, wrapper kontrol `lg:w-[min(100%,29rem)]`)
- Test: `tests/e2e/fluid-layout.e2e.spec.ts`

**Interfaces:**
- Produces: variabel CSS `--hero-card-w`, `--hero-card-h`, `--hero-card-text` di `:root`, dihitung dari `--hero-phones-w`/`--hero-stage-h`; `HeroCaptionCard` tidak berubah signature (`{ app: HeroApp; animate: boolean }`).

- [ ] **Step 1: Tulis tes gagal.** Di `fluid-layout.e2e.spec.ts` tambah ke `VIEWPORTS`: `{1536,752}`, `{3440,1440}`, `{1280,624}`. Tambah di dalam test "home hero" (hanya `viewport.width >= LG_MIN_WIDTH`) pengukuran kartu dan assertion:
  ```ts
  const card = el.querySelector('[data-hero-caption]')!.parentElement!.getBoundingClientRect()
  const group = el.querySelector('[data-hero-phone-link][data-slot="center"]')!  // grup HP = bounding union semua [data-hero-phone-link]
  // phonesW = union lebar ketiga HP; fontPx = getComputedStyle(captionText).fontSize
  expect(card.width).toBeLessThanOrEqual(phonesW + TOLERANCE_PX)       // kartu tak lebih lebar dari grup HP
  expect(card.height).toBeLessThanOrEqual(stageHeight * 0.2 + TOLERANCE_PX)
  expect(fontPx).toBeGreaterThanOrEqual(12)
  expect(fontPx).toBeLessThanOrEqual(16)
  ```
- [ ] **Step 2: Run** `pnpm test:e2e tests/e2e/fluid-layout.e2e.spec.ts` (tanpa `--`). Expected: FAIL pada 1536×752 dan 1280×624 (kartu 464px > grup HP).
- [ ] **Step 3: Implement.** Di `globals.css` tambah `--hero-card-w` (≤ `--hero-phones-w`, `min()`/`clamp()` dengan batas `29rem`), `--hero-card-h` (`clamp(6rem, …stage…, 8rem)`), `--hero-card-text` (`clamp(0.8125rem, …, 1rem)`); perbarui offset `10.625rem` di `--hero-phones-w` menjadi tinggi kartu maksimum + jarak + kontrol (kartu tidak boleh menutup HP tengah > 16px). `HeroCaptionCard`: `lg:h-[var(--hero-card-h)]`, `font-size` lewat `lg:text-[length:var(--hero-card-text)]` pada wrapper isi; `HeroStage`: root `lg:w-[var(--hero-phones-w)]` (tanpa `max(...,29rem)`) dan wrapper kontrol `lg:w-[var(--hero-card-w)]`. Mobile (`< lg`) tidak berubah.
- [ ] **Step 4: Run** `pnpm test:e2e tests/e2e/fluid-layout.e2e.spec.ts tests/e2e/home-hero-carousel.e2e.spec.ts` dan `pnpm exec vitest run --config ./vitest.config.mts tests/int/heroStage.int.spec.ts tests/int/heroCssTiming.int.spec.ts tests/int/homeHero.int.spec.ts`. Expected: semua PASS (termasuk `CAPTION_OVERLAP_MAX_PX = 16`, tanpa overflow horizontal).
- [ ] **Step 5: Verifikasi visual** di browser pada 1536×752, 1920×1080, 2560×1440: kartu proporsional, tanpa pemotongan; CLS < 0,1 (DevTools/`PerformanceObserver`).

---

### Task 2: Registry ikon sumber-tunggal + `SiteIcon`

**Files:**
- Create: `src/fields/appIcons.ts`
- Create: `src/components/site/iconMap.ts`
- Modify: `src/components/site/SiteIcon.tsx`
- Test: `tests/int/appIcons.int.spec.ts`

**Interfaces:**
- Produces:
  - `appIconNames` (readonly tuple, ±150 nama kebab-case Lucide; **memuat 20 nama `siteIconNames`** dan `'check'`), `type AppIconName = (typeof appIconNames)[number]`.
  - `isAppIconName(value: unknown): value is AppIconName`
  - `iconKeywords: Partial<Record<AppIconName, readonly string[]>>` (kata kunci pencarian, EN+ID, mis. finance → `['uang','money']`).
  - `ICON_MAP: Record<AppIconName, LucideIcon>` di `iconMap.ts`.
  - `SiteIcon` (signature tetap: `{ name?: string | null } & LucideProps`), kini memakai `ICON_MAP`; nama tak dikenal → `Sparkles`.
- Consumes: `siteIconNames` dari `src/fields/iconSelect.ts` (tidak diubah).

- [ ] **Step 1: Tulis tes gagal** `appIcons.int.spec.ts`:
  - `it('semua nama Home (siteIconNames) ada di appIconNames')`
  - `it('tidak ada duplikat dan semua kebab-case')`
  - `it('setiap nama punya komponen di ICON_MAP')` (`expect(ICON_MAP[name]).toBeTruthy()` untuk semua; jumlah kunci = jumlah nama)
  - `it('isAppIconName menerima nama valid, menolak "", null, "<script>", "Check" (huruf besar)')`
  - `it('daftar append-only: nama snapshot v1 tetap ada')` — snapshot literal 20 nama Home + `'check'`; tes ini gagal bila ada nama dihapus.
  - `it('SiteIcon: nama tak dikenal dan null merender ikon fallback tanpa error')` (RTL `render`).
  - `it('tidak ada Client Component publik yang mengimpor iconMap')`: baca `src/**/*.tsx` dengan `fs`; berkas berawalan `'use client'` di luar `src/collections/**` dan `src/fields/IconPicker/**` tidak boleh memuat `iconMap`.
- [ ] **Step 2: Run** `pnpm exec vitest run --config ./vitest.config.mts tests/int/appIcons.int.spec.ts`. Expected: FAIL (modul belum ada).
- [ ] **Step 3: Implement** modul di atas. Pilih ±150 ikon relevan untuk app (keuangan, ibadah, pendidikan, produktivitas, keamanan, perangkat, komunikasi, bisnis); setiap nama harus ada di `lucide-react` 0.563 (impor bernama eksplisit di `iconMap.ts`, tree-shakeable; **jangan** `import * as`/`icons`). Hapus `ICONS`/`SiteIconName` lokal di `SiteIcon.tsx`.
- [ ] **Step 4: Run** tes di atas + `pnpm exec tsc --noEmit`. Expected: PASS.

---

### Task 3: Picker ikon admin (popup bergambar)

**Files:**
- Create: `src/fields/iconField.ts`
- Create: `src/fields/IconPicker/IconPickerGrid.tsx`, `IconPickerField.tsx`, `iconPicker.scss`
- Modify: `src/fields/iconSelect.ts` (hanya menambah `admin.components.Field` + `admin.custom`; opsi/nilai tetap 20)
- Generated: `src/app/(payload)/admin/importMap.js`
- Test: `tests/int/iconPicker.int.spec.ts`, `tests/e2e/admin-pickers.e2e.spec.ts`

**Interfaces:**
- Produces:
  - `iconNameError(value: unknown, allowed: readonly string[]): string | null` (`null` bila kosong/valid).
  - `iconField(overrides?: Partial<TextField>): TextField` — `name: 'icon'`, `type: 'text'`, `localized: false`, `validate` memakai `iconNameError(value, appIconNames)`, `admin.components.Field: '@/fields/IconPicker/IconPickerField#IconPickerField'`, `admin.custom: { iconSet: 'app' }`.
  - `IconPickerGrid` props: `{ names: readonly string[]; value: string | null; onSelect: (name: string | null) => void; labels: { search: string; clear: string; empty: string } }` — kolom cari menyaring nama + `iconKeywords`, grid `role="listbox"` dengan `role="option"` + `aria-selected`, panah keyboard, tombol "Hapus pilihan", pesan kosong.
  - `IconPickerField` (client): `useField<string>`; tombol berpratinjau + nama; membuka `Modal` (`slug` unik per `path`) berisi `IconPickerGrid`; `custom.iconSet: 'app' | 'site'` memilih `appIconNames` atau `siteIconNames` (Home).
- Consumes: `appIconNames`, `iconKeywords`, `ICON_MAP` (Task 2).

- [ ] **Step 1: Tulis tes gagal** `iconPicker.int.spec.ts`:
  - `iconNameError`: `(undefined)`→`null`, `('')`→`null`, `('wallet')`→`null`, `('nope')`→string, `('<img>')`→string.
  - `iconField().validate` menolak `'nope'`, menerima `'wallet'` dan kosong.
  - `IconPickerGrid`: mengetik `"uang"` menyisakan ikon ber-keyword itu; `"zzzz"` menampilkan pesan kosong; klik ikon memanggil `onSelect('wallet')`; tombol hapus memanggil `onSelect(null)`; `aria-selected="true"` hanya pada nilai terpilih; ArrowRight memindah fokus.
- [ ] **Step 2: Run** `pnpm exec vitest run --config ./vitest.config.mts tests/int/iconPicker.int.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** modul di atas; ikuti pola modal `src/collections/Apps/components/SlugLockField.tsx` (`Modal`, `useModal`, scss terpisah). Picker dimuat di bundel admin saja. Jalankan `pnpm generate:importmap`.
- [ ] **Step 4: Run** tes int + `pnpm exec tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Tulis e2e admin** `admin-pickers.e2e.spec.ts` (pola login `tests/helpers/login.ts`, `seedUser.ts`; buat dokumen lewat REST seperti `legal.e2e.spec.ts`): buka app → tab "Page sections" (Task 5) → klik tombol ikon → popup terbuka → cari `wallet` → pilih → popup tertutup, pratinjau berubah → simpan → muat ulang, nilai bertahan; hapus pilihan → kosong; `Esc` menutup popup. Tes ini baru lulus setelah Task 5; tandai di Task 5 Step 6.

---

### Task 4: Preset warna aksen (token, kontras, field admin)

**Files:**
- Create: `src/utilities/apps/accent.ts`
- Create: `src/collections/Apps/components/AccentColorField.tsx`, `accentColor.scss`
- Create: `src/fields/accentColorField.ts`
- Create: `tests/helpers/contrast.ts` (ekstrak `luminance`/`contrast`/pembacaan token dari `tests/int/themeTokens.int.spec.ts`, spec itu mengimpornya; perilaku tes tidak berubah)
- Modify: `src/app/(frontend)/globals.css` (token per preset × 3 blok tema)
- Test: `tests/int/accentPresets.int.spec.ts`

**Interfaces:**
- Produces:
  - `ACCENT_PRESETS` (tuple 12 nama, urutan Global Constraints), `type AccentPreset`, `isAccentPreset(v: unknown): v is AccentPreset`, `accentPresetError(v: unknown): string | null`.
  - `accentSwatches: Record<AccentPreset, { light: string; dark: string }>` (hex isian `--app-accent` per tema; **sumber untuk kotak warna admin**, wajib identik dengan `globals.css`).
  - `accentColorField(): TextField` (`name: 'accentColor'`, `localized: false`, validate `accentPresetError`, Field `AccentColorField`).
  - CSS: `[data-accent='<preset>']` mendefinisikan `--app-accent` (fill/UI ≥ 3:1), `--app-accent-text` (teks ≥ 4,5:1), `--app-accent-soft`; tanpa atribut → turunan `--primary`/`--primary-soft` (`:root`).
- Consumes: token `--background`, `--bg-raised`, `--surface`, `--surface-2` (kedua tema + `prefers-color-scheme`).

- [ ] **Step 1: Tulis tes gagal** `accentPresets.int.spec.ts` (`it.each` 12 preset × 3 blok tema):
  - `--app-accent-text` terhadap `--background`, `--surface`, `--bg-raised` ≥ 4,5 (tema terang, gelap, dan blok `prefers-color-scheme`);
  - `--app-accent` terhadap `--background` dan `--surface` ≥ 3;
  - `accentSwatches[p].light/dark` sama dengan `--app-accent` di CSS;
  - tiap preset terdefinisi di ketiga blok; `isAccentPreset`/`accentPresetError` menolak `'#ff0000'`, `'Green'`, `'nope'`; menerima `'green'` dan menganggap `undefined`/`null`/`''` sebagai "tanpa preset" (valid).
- [ ] **Step 2: Run** `pnpm exec vitest run --config ./vitest.config.mts tests/int/accentPresets.int.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** modul + token. Preset terang (`lime`, `amber`) memakai `--app-accent-text` lebih gelap di tema terang. Nilai gagal AA **disesuaikan nilainya**, bukan dilonggarkan. `AccentColorField`: grid `role="radiogroup"` kotak warna (label nama, centang, "Brand (default)"), `useField<string>`, keyboard panah; swatch lewat custom property `--swatch` + scss (inline style hanya di admin).
- [ ] **Step 4: Run** tes + `pnpm exec vitest run --config ./vitest.config.mts tests/int/themeTokens.int.spec.ts` + `pnpm exec tsc --noEmit`. Expected: PASS.

---

### Task 5: Skema `Apps` + migrasi aditif

**Files:**
- Create: `src/collections/Apps/fields/pageSections.ts` (membangun field tab "Page sections")
- Modify: `src/collections/Apps/index.ts` (tab baru, `accentColor` di tab Overview, `features[]` + `icon` + `description`)
- Generated: `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js`, `src/migrations/<timestamp>_app_page_sections.{ts,json}`, `src/migrations/index.ts`
- Test: `tests/int/apps-sections.int.spec.ts`

**Interfaces:**
- Produces (bentuk `App` setelah `generate:types`): `accentColor?: string | null`; `highlights?: { icon?: string|null; title: string; description?: string|null; id?: string }[]`; `howItWorks?: { title?: string|null; description?: string|null; steps?: { title: string; description?: string|null; image?: number|Media|null; id?: string }[] }`; `featuresIntro?: { title?: string|null; description?: string|null }`; `features?[].icon/description`; `dataControl?: { title?: string|null; description?: string|null }`.
- Consumes: `iconField` (Task 3), `accentColorField` (Task 4), `requiredInDefaultLocale`/`defaultLocale`.

- [ ] **Step 1: Tulis tes gagal** `apps-sections.int.spec.ts` (pola `apps.int.spec.ts`: `getPayload`, nama unik, hapus di `afterAll`, `context: { disableRevalidate: true }`):
  - `it('app lama tanpa field baru tetap valid dan terbaca (highlights kosong, howItWorks/dataControl kosong)')`
  - `it('menyimpan section lengkap per locale; EN diisi, ID kosong → ID jatuh ke EN per field')` (locale `id` fallback `en`)
  - `it('menolak ikon di luar daftar dan accentColor di luar preset')` (`rejects.toThrow()`)
  - `it('menolak >3 highlight dan >4 langkah')`
  - `it('baris highlight tanpa title ditolak; description boleh kosong')`
  - `it('fitur lama {label} tanpa icon tetap valid; icon/description tersimpan')`
  - `it('menghapus Media gambar langkah tidak merusak baca dokumen (relasi jadi null/hilang)')`
  - `it('defaultPopulate tidak memuat field section')` (assert pada `Apps.defaultPopulate`).
- [ ] **Step 2: Run** `pnpm exec vitest run --config ./vitest.config.mts tests/int/apps-sections.int.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** skema sesuai Global Constraints; tab bernama `Page sections`; `defaultPopulate` **tidak diubah**. Jalankan `pnpm generate:types` dan `pnpm generate:importmap`.
- [ ] **Step 4: Run** tes + `pnpm exec tsc --noEmit` + `pnpm lint`. Expected: PASS (dev memakai schema push; kolom baru muncul otomatis di DB dev).
- [ ] **Step 5: Migrasi — minta konfirmasi pemilik**, lalu `pnpm payload migrate:create app_page_sections`. Tinjau SQL: **hanya** `CREATE TABLE`/`ADD COLUMN` (tabel utama, `_locales`, `_apps_v*`); tidak ada `DROP`/`ALTER COLUMN` lama; tidak menyentuh `home*`/`pages*`/`posts*`. Jika ada, hentikan dan laporkan.
- [ ] **Step 6: Uji up/down — minta konfirmasi** membuat DB sementara (mis. `kct_hub_migtest`): jalankan migrasi dari baseline sampai terbaru (`DATABASE_URL` diarahkan ke DB itu), lalu `pnpm payload migrate:down` dan `migrate` lagi. Expected: tanpa error; hapus DB sementara setelahnya. Jalankan `tests/e2e/admin-pickers.e2e.spec.ts` (Task 3) — Expected: PASS.
- [ ] **Step 7: Dokumentasi.** Tambah catatan di `docs/DEPLOYMENT.md` bagian F: migrasi `app_page_sections` aditif, `deploy.sh` menjalankannya otomatis, backup DB produksi sebelum deploy.

---

### Task 6: Halaman detail app (komponen per bagian)

**Files:**
- Create: `src/components/apps/detail/model.ts`
- Create: `src/components/apps/detail/AppDetailHero.tsx`, `AppHighlightStrip.tsx`, `HowItWorksSection.tsx`, `KeyFeaturesSection.tsx`, `DataControlBanner.tsx`, `RelatedAppRow.tsx`
- Modify: `src/app/(frontend)/[locale]/apps/[slug]/page.tsx` (menyusun komponen; logika data/JSON-LD/metadata tidak berubah)
- Modify: `src/i18n/dictionaries/en.ts`, `id.ts` (kunci `detail.howItWorks`, `detail.exploreFeatures`, `detail.learnMore`, `detail.stepNumber` = `'Step {n}'`/`'Langkah {n}'`; "View details" memakai `dict.app.viewDetails` yang sudah ada)
- Test: `tests/int/appDetailModel.int.spec.ts`, `tests/int/appDetailSections.int.spec.ts`, `tests/e2e/app-detail.e2e.spec.ts`

**Interfaces:**
- Produces (`model.ts`, murni):
  ```ts
  export type DetailHighlight = { icon: string | null; title: string; description: string | null }
  export type DetailStep = { title: string; description: string | null; image: ImageSource | null }
  export type DetailFeature = { icon: string | null; label: string; description: string | null }
  export type DetailSections = {
    accent: AccentPreset | null
    highlights: DetailHighlight[]                      // maks 3, baris tanpa title dibuang
    howItWorks: { title: string | null; description: string | null; steps: DetailStep[] } | null // null bila 0 langkah
    featuresIntro: { title: string | null; description: string | null }
    features: DetailFeature[]                          // label kosong dibuang; icon null → pemanggil memakai 'check'
    dataControl: { title: string; description: string } | null // null bila title ATAU description kosong
  }
  export const toDetailSections = (app: App, stepAlt: (title: string, index: number) => string): DetailSections
  export const heroPhones = (screenshots: ImageSource[]): Array<{ slot: PhoneSlot; image: ImageSource }>
  ```
  `heroPhones` memakai `slotScreenIndex(count, slot)` dari `src/components/home/heroCarouselModel.ts` (kiri = screenshot 2, tengah = 1, kanan = 3; 0 → `[]`; maks 3).
- Komponen server menerima view model (bukan `App`): `AppDetailHero({ app, category, platforms, status, screenshots, url, dict, locale, installLabel })`; `AppHighlightStrip({ icon, name, categoryTitle, highlights })`; `HowItWorksSection({ data, featuresHref: '#features', dict })`; `KeyFeaturesSection({ intro, features, dict })` (`id="features"`); `DataControlBanner({ data, learnMoreHref: string | null, dict })`; `RelatedAppRow({ app: AppCard, locale, dict })`. Atribut uji: `data-section="highlights|how-it-works|features|data-control|related"` pada elemen akar tiap bagian; `data-accent` pada `<article>`.
- Consumes: `App` (Task 5), `SiteIcon`, `AppIcon`, `StatusChip`, `ButtonLink`, `legalIndexPath`, token `--app-accent*` (Task 4).

- [ ] **Step 1: Tulis tes model gagal** `appDetailModel.int.spec.ts`:
  - `app` tanpa field baru → `highlights: []`, `howItWorks: null`, `dataControl: null`, `features` dari `label` saja, `accent: null`.
  - >3 highlight → 3 pertama; highlight tanpa `title` dibuang; fitur `label: '  '` dibuang.
  - `dataControl` hanya `title` → `null`; keduanya terisi → objek.
  - `accentColor: 'nope'` → `accent: null`.
  - `heroPhones`: 0 → `[]`; 1 → `[center #1]`; 2 → `[left #2, center #1]`; 3 → `[left #2, center #1, right #3]`; 5 → tetap 3.
  - langkah dengan `image` relasi `number` (belum di-populate) → `image: null`; `stepAlt` dipanggil untuk alt bila Media tanpa `alt`.
- [ ] **Step 2: Tulis tes komponen gagal** `appDetailSections.int.spec.ts` (RTL `render`): tiap komponen tanpa data tidak merender akar `data-section`; `KeyFeaturesSection` merender `<h2 id="features">`, ikon default `check` untuk fitur tanpa ikon; `HowItWorksSection` memberi anchor `href="#features"`; `DataControlBanner` tanpa `learnMoreHref` tidak merender tautan; teks 200 karakter tanpa spasi tetap berada dalam kartu (`break-words` ada di class); `RelatedAppRow` memakai satu tautan nama (`<a href>`) dengan `data-quick-view`.
- [ ] **Step 3: Run** `pnpm exec vitest run --config ./vitest.config.mts tests/int/appDetailModel.int.spec.ts tests/int/appDetailSections.int.spec.ts`. Expected: FAIL.
- [ ] **Step 4: Implement** model + komponen + kamus. Urutan di `page.tsx`: hero (breadcrumb, chip, `<h1>`, tagline, Play Store + Share, tiga HP dengan `next/image` turunan Media; hanya HP tengah `priority`) → strip → baris spec (`dl`, isi sama) → How It Works → Key Features (daftar fitur dipindah dari "About") → banner → galeri → About (rich text/`shortDescription`) → `aside` "App information" (**tetap `aside` dengan `[data-legal-links]`**, dibutuhkan `legal.e2e.spec.ts`) → More apps (`RELATED_LIMIT = 3`) → bar Play Store mobile. `data-accent` pada `<article>`; warna hanya lewat token. Hero detail **tidak** memakai `HeroPhone`/`HeroStage`.
- [ ] **Step 5: Run** tes int di atas + `pnpm exec tsc --noEmit` + `pnpm lint`. Expected: PASS.
- [ ] **Step 6: Tulis e2e** `app-detail.e2e.spec.ts` (REST create/cleanup seperti `legal.e2e.spec.ts`): (a) app **dengan** semua section → `data-section` muncul berurutan highlights → how-it-works → features → data-control → related, `data-accent="green"`, satu `<h1>`, canonical/hreflang/JSON-LD tetap, `aside [data-legal-links]` ada; (b) app **tanpa** section baru → tidak ada `data-section` selain `related`, "About" dan galeri utuh, satu `<h1>`; (c) tema terang & gelap (`data-theme`) tanpa overflow horizontal pada 390×844, 768×1024, 1440×900, 2560×1440; (d) `/en/apps/<slug>` memakai teks EN, `/apps/<slug>` ID dengan fallback EN.
- [ ] **Step 7: Run** `pnpm test:e2e tests/e2e/app-detail.e2e.spec.ts tests/e2e/legal.e2e.spec.ts tests/e2e/fluid-layout.e2e.spec.ts tests/e2e/frontend.e2e.spec.ts tests/e2e/kct-hub.e2e.spec.ts`. Expected: PASS.

---

### Task 7: Seed konten yang aman (idempoten, tidak menimpa)

**Files:**
- Modify: `src/endpoints/seed/kct/content.ts` (per app: `accentColor`, `featureIcons: string[]` paralel `features`)
- Modify: `src/endpoints/seed/kct/index.ts`
- Test: `tests/int/seedAppSections.int.spec.ts`

**Interfaces:**
- Produces (di `seed/kct/index.ts`, diekspor untuk tes):
  - `mergeFeatureRows(labels: string[], icons: string[], existing: Array<{ id?: string|null; icon?: string|null; description?: string|null }> | null): Array<{ id?: string; label: string; icon?: string; description?: string }>` — mempertahankan `id`, `icon`, `description` baris yang ada; mengisi `icon` seed **hanya bila kosong**.
  - `mergeHighlights(seed: Array<{icon:string;title:string;description?:string}>, existing: unknown[] | null | undefined): typeof seed | undefined` — mengembalikan seed hanya bila `existing` kosong; selain itu `undefined` (tidak menulis).
- Consumes: logika seed yang ada (`withIds`, `pick`, `LOCALES`).

- [ ] **Step 1: Tulis tes gagal** `seedAppSections.int.spec.ts` (murni, tanpa DB): fitur lama tanpa ikon → `icon` terisi dari seed; editor sudah memilih `icon: 'zap'` + `description` → **bertahan** setelah merge; jumlah label lebih sedikit/banyak dari `existing` → tidak melempar, `id` tak bergeser ke baris salah; `mergeHighlights` dengan `existing` berisi 1 baris → `undefined`; dengan `[]`/`null` → seed.
- [ ] **Step 2: Run** `pnpm exec vitest run --config ./vitest.config.mts tests/int/seedAppSections.int.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Seed hanya mengisi yang bisa diturunkan dari `content.ts`: `accentColor` (hanya bila kosong), ikon `features`, `highlights` dari tiga fitur pertama (judul = label fitur, tanpa `description`). `howItWorks`, `featuresIntro`, deskripsi fitur, `dataControl` **tidak ditulis seed** (isi editor). Gambar langkah tidak dibuat.
- [ ] **Step 4: Run** tes + `pnpm exec tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Seed nyata — minta konfirmasi pemilik**, lalu `pnpm seed:kct` dan `POST /api/apps/revalidate` (login admin). Jalankan **dua kali**: baris DB kedua kali tidak berubah (`updatedAt` field section tidak bergerak / jumlah baris sama). Ubah satu ikon fitur di admin, jalankan seed lagi: ikon itu bertahan.

---

### Task 8: Verifikasi akhir dan dokumentasi

**Files:**
- Modify: `design/README.md` (pemetaan field CMS baru + catatan selisih `.pen`; **tanpa** mengubah `design/kct-hub.pen`)
- Create/Modify: tidak ada kode produk baru.

- [ ] **Step 1: Suite penuh.** Run berurutan: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm exec prettier --check .` (hanya berkas yang diubah), `pnpm test:int`, `pnpm test:e2e`, `pnpm build`. Expected: semua lulus; laporkan jumlah tes dibanding baseline Task 0.
- [ ] **Step 2: Bundel.** Bandingkan ukuran JS halaman `/apps/[slug]` (output `pnpm build`) dengan baseline: tidak naik karena ikon (peta ikon hanya di server/admin); catat angkanya.
- [ ] **Step 3: SEO & performa halaman detail dan Beranda.** View-source: title/description/canonical/OG/hreflang/JSON-LD benar, satu `<h1>`, alt gambar lengkap. Lighthouse mobile: SEO & A11y ≥ 95, Performance ≥ 90, CLS < 0,1.
- [ ] **Step 4: Cek manual tiga viewport** (1536×752, 1920×1080, 2560×1440) untuk hero Beranda dan halaman detail satu app berkonten penuh (kedua tema, satu preset per cek).
- [ ] **Step 5: Dokumentasi.** Perbarui `design/README.md`. Usulkan (jangan terapkan tanpa persetujuan) butir untuk `CLAUDE.md`: skala kartu hero, picker ikon/preset aksen, aturan `iconMap` hanya server+admin. Laporkan: selisih `.pen`, `DocumentTypes` (ikon legal) sebagai tindak lanjut opsional, dan bahwa checkout utama `master` lokal tertinggal dari `origin/master`.
