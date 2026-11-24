# Hero Screen Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layar 3 HP di hero homepage bergeser otomatis dan lewat tombol (app berikutnya/sebelumnya), kotak deskripsi di bawah tengah berganti sesuai app di HP tengah, dan tiap HP bisa diklik ke halaman detail app-nya.

**Architecture:** HP tetap di posisinya (pose wrapper + `data-story-part="phone-*"` untuk GSAP tidak disentuh); isi layar tiap HP adalah track 3 layer (`sebelumnya, sekarang, berikutnya`) yang digeser dengan `transform` CSS. State indeks aktif ada di satu komponen client (`HeroStage`); logika ring/swipe/autoplay murni dipisah ke modul tanpa React agar bisa diuji. Server tetap merender keadaan awal (LCP/CLS tidak berubah); layer tetangga baru dipasang saat idle/interaksi.

**Tech Stack:** Next.js 16 (App Router) + React 19, Payload CMS 3, Tailwind v4, `next/image`, `next/link`, `lucide-react`, Vitest 4, Playwright 1.63 (`page.clock`).

**Spec:** `docs/superpowers/specs/2026-11-24-hero-screen-carousel-design.md`

## Global Constraints

- Tanpa dependensi baru, tanpa migrasi database, tanpa mengubah GSAP (`scrollStory.ts`, `scrollStoryConfig.ts`) maupun tes `home-scroll-story.e2e.spec.ts` / `scrollStory.int.spec.ts`.
- Batas showcase `HERO_SHOWCASE_MAX = 8`; jeda otomatis `5000` ms; geser `500` ms; stagger antar HP `60` ms; ambang swipe `40` px.
- Susunan stage (indeks array = posisi kiri, tengah, kanan): n=1 → `[a]`; n=2 → `[a+1, a]`; n≥3 → `[a-1, a, a+1]` (modulo n), a = indeks aktif.
- Render awal SSR = hari ini: hanya layer "sekarang"; HP tengah `priority`, HP sisi `eager` + `fetchPriority=low`. Layer tetangga: `eager` + `fetchPriority=low`, dipasang setelah idle/interaksi pertama.
- Hanya `transform`/`opacity` yang dianimasikan; tanpa inline style dan tanpa hex di komponen; token Tailwind/CSS variable yang ada.
- Elemen interaktif di luar wrapper `aria-hidden`; anchor HP `aria-hidden="true"` + `tabIndex={-1}`; tombol ≥ 44×44 px.
- Link internal lewat `appHref(slug, locale)` (`src/components/site/AppCard.tsx`), tanpa `data-quick-view`.
- Tulis label baru di `src/i18n/dictionaries/{en,id}.ts` (tipe `Dictionary = typeof en`).
- Nama situs/branding: jangan hardcode; jangan memakai kata "eksperimen/laboratorium".
- Commit **hanya setelah persetujuan eksplisit pengguna** (CLAUDE.md). Format `tipe: deskripsi` tanpa atribusi AI. Jangan menyertakan `src/payload-types.ts` dan `tsconfig.tsbuildinfo` (sudah modified sebelum pekerjaan ini) kecuali berubah karena tugas ini.
- Perintah: `pnpm exec vitest run --config ./vitest.config.mts <file>`, `pnpm test:e2e <file>` (tanpa `--`), `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`.

## Review Focus

Input/kondisi yang tidak disebut spesifik tetapi paling mungkin menggigit pengguna (tiap baris punya tesnya di task pemilik):

1. Klik tombol/swipe berulang cepat saat transisi berjalan → tidak menumpuk, tidak lompat (Task 3, 5).
2. JS belum hidrasi/dimatikan → tombol tidak boleh tampak mati; deskripsi dan tautan HP tetap berfungsi (Task 3).
3. Data tepi: 1 app, 2 app, app yang sama dipilih dua kali di Admin, app tanpa screenshot, `shortDescription` kosong (Task 1, 2, 3).
4. Setelah klik tombol dengan mouse, autoplay harus lanjut saat kursor keluar (fokus mouse ≠ fokus keyboard) (Task 4).
5. Tab disembunyikan lalu dibuka kembali, pindah halaman, atau ganti locale → tidak ada tick beruntun/timer bocor (Task 4).
6. Geser vertikal di mobile tetap men-scroll halaman; swipe horizontal tidak membuka halaman app (Task 5).

---

### Task 1: Lapisan data showcase (batas 8, dedup, shortDescription)

**Files:**
- Create: `src/utilities/apps/heroShowcase.ts`
- Create: `tests/int/heroShowcase.int.spec.ts`
- Modify: `src/globals/Home/config.ts:95-105` (field `showcaseApps`)
- Modify: `src/utilities/apps/queries.ts:258-277` (`getShowcaseApps`)
- Modify: `src/components/home/HomeHero.tsx:14` (tipe `ShowcaseApp` saja)
- Modify: `src/app/(frontend)/[locale]/page.tsx:45-47`

**Interfaces:**
- Produces: `HERO_SHOWCASE_MAX: 8`; `normalizeShowcase<T extends { id: number | string }>(items: readonly T[]): T[]` (buang duplikat `id`, urutan pertama menang, potong ke `HERO_SHOWCASE_MAX`); `ShowcaseApp = Pick<App, 'id' | 'name' | 'slug' | 'shortDescription' | 'screenshots'>`.

- [ ] **Step 1: Baseline kinerja (sebelum ada perubahan)** — jalankan `pnpm build` lalu `pnpm start`, ukur halaman `/` dengan Lighthouse mobile 3 kali (median LCP, CLS, TBT, skor Performance/A11y/SEO) dan catat angkanya di catatan kerja (tidak di-commit). Expected: angka tercatat untuk dibandingkan di Task 6.
- [ ] **Step 2: Tulis tes gagal** `tests/int/heroShowcase.int.spec.ts`: (a) `normalizeShowcase([{id:1},{id:2},{id:1}])` → `[{id:1},{id:2}]`; (b) 10 item unik → panjang `HERO_SHOWCASE_MAX` dan urutan asli; (c) `[]` → `[]`; (d) `HERO_SHOWCASE_MAX === 8`; (e) field `showcaseApps` pada config global Home (`import { Home } from '@/globals/Home/config'`, cari di tab `hero`) memiliki `maxRows === HERO_SHOWCASE_MAX` dan `hasMany === true`.
- [ ] **Step 3: Jalankan tes, pastikan gagal** — `pnpm exec vitest run --config ./vitest.config.mts tests/int/heroShowcase.int.spec.ts` → FAIL (modul belum ada).
- [ ] **Step 4: Implementasi** `heroShowcase.ts` (konstanta bernama + `normalizeShowcase` dengan `Set` id); di `Home/config.ts` ganti `maxRows: 3` → `HERO_SHOWCASE_MAX` dan deskripsi menjadi "Up to 8 apps rotate in the phone stage (their first screenshot is used; the first app starts in the centre). Empty = featured apps."; di `queries.ts` tambah `shortDescription: true` pada `select` `getShowcaseApps` dan perluas tipe kembaliannya; di `HomeHero.tsx` perluas `ShowcaseApp`; di `page.tsx` pakai `normalizeShowcase(picked)` dan `getShowcaseApps(locale, HERO_SHOWCASE_MAX)` (hasilnya juga lewat `normalizeShowcase`). `getHome` memakai `depth: 2`, jadi app pilihan editor sudah memuat `shortDescription` (tidak ada perubahan query).
- [ ] **Step 5: Jalankan tes + `pnpm exec tsc --noEmit` + `pnpm lint`** → semua PASS/bersih. `pnpm generate:types` tidak boleh menambah diff pada `payload-types.ts` selain yang sudah ada (cek `git diff --stat`); bila ada diff baru dari `maxRows`, laporkan.
- [ ] **Step 6: Commit** (setelah disetujui pengguna): `feat: batas showcase hero 8 app dan shortDescription pada query` — sertakan spec dan plan di commit docs terpisah `docs: spesifikasi dan rencana carousel hero`.

### Task 2: Model carousel murni (ring, jendela layer, swipe, aturan autoplay)

**Files:**
- Create: `src/components/home/heroCarouselModel.ts`
- Create: `tests/int/heroCarouselModel.int.spec.ts`

**Interfaces:**
- Produces (semua murni, tanpa React/DOM):
  - konstanta `HERO_AUTOPLAY_MS = 5000`, `HERO_SLIDE_MS = 500`, `HERO_STAGGER_MS = 60`, `HERO_SWIPE_PX = 40`
  - `type SlideDirection = 'next' | 'prev'`
  - `wrapIndex(index: number, count: number): number` (modulo non-negatif; `count <= 0` → `0`)
  - `stepActive(active: number, count: number, direction: SlideDirection): number`
  - `stageAppIndexes(active: number, count: number): number[]` (aturan Global Constraints)
  - `layerWindow(appIndex: number, count: number): [number, number, number]` → `[wrap(a-1), a, wrap(a+1)]`
  - `swipeDirection(dx: number, dy: number, threshold?: number): SlideDirection | null` (`dx` negatif = `'next'`; null bila `|dx| < threshold` atau `|dy| >= |dx|`)
  - `type AutoplayState = { count: number; reducedMotion: boolean; userPaused: boolean; interacting: boolean; pageHidden: boolean; inView: boolean }` dan `isAutoplayRunning(state: AutoplayState): boolean` (true hanya bila `count > 1` dan semua kondisi penghenti salah/`inView` benar).

- [ ] **Step 1: Tulis tes gagal** (nama + assertion): `wrapIndex(-1, 3) === 2`, `wrapIndex(3, 3) === 0`, `wrapIndex(5, 0) === 0`; `stageAppIndexes(0, 0)` → `[]`, `(0,1)` → `[0]`, `(0,2)` → `[1,0]`, `(1,2)` → `[0,1]`, `(0,3)` → `[2,0,1]`, `(7,8)` → `[6,7,0]`; `stepActive(0,3,'prev') === 2`, `stepActive(2,3,'next') === 0`; `layerWindow(0,8)` → `[7,0,1]`; untuk n=3, mengulang `stepActive(…,'next')` tiga kali kembali ke indeks awal; `swipeDirection(-60, 5) === 'next'`, `(60,5) === 'prev'`, `(-30,0) === null`, `(-60, 80) === null`; `isAutoplayRunning` false untuk `count: 1`, dan false bila salah satu dari `reducedMotion`, `userPaused`, `interacting`, `pageHidden` true atau `inView` false; true untuk keadaan bersih `count: 3`.
- [ ] **Step 2: Jalankan, pastikan gagal** — `pnpm exec vitest run --config ./vitest.config.mts tests/int/heroCarouselModel.int.spec.ts` → FAIL.
- [ ] **Step 3: Implementasi** semua fungsi di atas di `heroCarouselModel.ts`; komentar singkat mengapa `HERO_SLIDE_MS`/`HERO_STAGGER_MS` harus sama dengan CSS (`globals.css`, "KEEP IN SYNC", mengikuti preseden `STORY_QUERY`).
- [ ] **Step 4: Jalankan tes + tsc + lint** → PASS.
- [ ] **Step 5: Commit** (setelah disetujui): `feat: model murni carousel hero`.

### Task 3: Stage carousel — render, navigasi manual, deskripsi, tautan HP

**Files:**
- Create: `src/components/home/HeroStage.tsx` (`'use client'`)
- Create: `src/components/home/HeroPhone.tsx` (`'use client'`)
- Create: `tests/e2e/home-hero-carousel.e2e.spec.ts`
- Modify: `src/components/home/HomeHero.tsx` (hapus pose/`STAGE`/`ORDER`/`PhoneFrame` dari sini; render `<HeroStage>`)
- Modify: `src/components/site/PhoneFrame.tsx` (prop `screen?: React.ReactNode`)
- Modify: `src/i18n/dictionaries/en.ts`, `src/i18n/dictionaries/id.ts` (blok `home`)
- Modify: `src/app/(frontend)/globals.css` (kelas `.hero-track`, animasi deskripsi, aturan `data-ready`)

**Interfaces:**
- Consumes: `stageAppIndexes`, `stepActive`, `layerWindow`, `HERO_SLIDE_MS`, `HERO_STAGGER_MS`, `SlideDirection` (Task 2); `phoneSlot` dari `scrollStoryConfig.ts`; `ShowcaseApp` (Task 1).
- Produces:
  - `type HeroApp = { id: number; name: string; href: string; shortDescription: string | null; image: ImageSource | null }` (diekspor dari `HeroStage.tsx`; `href` sudah dilokalisasi di server, `image.alt` sudah berisi `screenshotAlt`).
  - `HeroStage: React.FC<{ apps: HeroApp[]; labels: HeroLabels }>` dengan `HeroLabels = { carousel: string; prev: string; next: string; pause: string; play: string }`; `HomeHero` memberi `key={apps.map(a => a.id).join('.')}` agar state ter-reset saat daftar/locale berubah.
  - `HeroPhone: React.FC<{ app: HeroApp; layers: HeroApp[]; slot: PhoneSlot; priority: boolean; slide: SlideDirection | null; neighborsReady: boolean }>`; anchor `Link` (`data-hero-phone-link`, `data-slot`) membungkus `PhoneFrame`; track `.hero-track` dengan `data-slide`, `data-slot`.
  - Atribut uji pada grup: `[data-hero-carousel]` dengan `data-ready` (`"false"` sebelum efek mount, lalu `"true"`), `data-active-index`, `data-animating`; deskripsi: `[data-hero-caption]` berisi `a[data-hero-caption-link]` dan `p[data-hero-caption-text]`.
  - Kamus baru `home.heroCarousel`, `heroPrev`, `heroNext`, `heroPause`, `heroPlay`: EN `Featured apps`, `Previous app`, `Next app`, `Pause slideshow`, `Start slideshow`; ID `Aplikasi unggulan`, `Aplikasi sebelumnya`, `Aplikasi berikutnya`, `Jeda tayangan`, `Putar tayangan`.

- [ ] **Step 1: Tulis tes e2e gagal** di `home-hero-carousel.e2e.spec.ts` (BASE `http://localhost:3000`, viewport desktop 1440×900 seperti `home-scroll-story`; tanpa hardcode nama app — bandingkan lewat `href`):
  - `initial SSR: centre phone link equals caption link, one h1, three phone links with aria-hidden="true" and tabindex="-1"` (juga dengan `javaScriptEnabled: false`: deskripsi dan tautan ada, tombol `visibility: hidden`).
  - `next moves the right app to the centre`: catat `href` HP kanan → klik tombol `Next app` → tunggu `data-animating="false"` → `href` HP tengah dan tautan deskripsi sama dengan catatan; `prev` simetris; 3× next kembali ke app awal (wrap).
  - `rapid clicking never stacks`: klik `Next app` 6× tanpa menunggu → `data-active-index` bertambah paling banyak satu per transisi dan akhirnya valid (`0 ≤ index < n`); tidak ada konsol error.
  - `each phone links to its own detail page`: klik HP kiri/tengah/kanan → URL `/apps/<slug>` yang cocok dengan `href`-nya; di `/id/` menuju `/id/apps/<slug>`.
  - `cursor is pointer on phones`: `getComputedStyle(link).cursor === 'pointer'`.
  - `side phones keep GSAP part nodes`: `[data-story-part="phone-left"]`, `-center`, `-right` ada masing-masing 1.
  - Tes `locale id` memakai kamus Indonesia untuk nama aksesibel tombol (`Aplikasi berikutnya`).
- [ ] **Step 2: Jalankan, pastikan gagal** — `pnpm test:e2e tests/e2e/home-hero-carousel.e2e.spec.ts` (dev server `pnpm dev` aktif, data seed) → FAIL.
- [ ] **Step 3: Implementasi `PhoneFrame` `screen` prop** — bila `screen` diisi, tampil menggantikan `<Image>` di dalam layar; perilaku pemakai lain (Featured, dll.) tidak berubah.
- [ ] **Step 4: Implementasi `HeroPhone`** — track 3 layer: layer `k∈{0,1,2}` absolut `inset-0` bergeser `(k-1)*100%`, keyed oleh `app.id`; `slide` mengatur `data-slide` pada track (`next` → geser −100%, `prev` → +100%); bg layer `bg-surface-2`; sebelum `neighborsReady` hanya layer tengah yang dipasang; gambar layer tetangga `eager` + `fetchPriority="low"`; `draggable={false}`; anchor `display:block`, `cursor-pointer`, sudut mengikuti bingkai (`rounded-[38px]`, mobile `rounded-[26px]`); kelas pose dan `data-story-part={`phone-${slot}`}` dipindahkan apa adanya dari `HomeHero` (termasuk varian `phones.length === 1`).
- [ ] **Step 5: Implementasi `HeroStage`** — state `active` (0), `slide` (null|arah), `neighborsReady`; `go(direction)`: abaikan bila `slide !== null`; pasang `neighborsReady`; bila `prefers-reduced-motion` commit seketika, selain itu set `slide` dan commit `stepActive` setelah `HERO_SLIDE_MS + 2 * HERO_STAGGER_MS` ms (`setTimeout` dibersihkan saat unmount); `neighborsReady` juga true setelah `requestIdleCallback` (fallback `setTimeout` 1000 ms) dan pada `pointerenter`/`focus`/`touchstart` pertama; set `data-ready="true"` di efek mount. Struktur: wrapper `role="group"` + `aria-roledescription="carousel"` + `aria-label={labels.carousel}`; di dalamnya div `aria-hidden` berisi tiga `HeroPhone` (tinggi `h-[380px] lg:h-[748px]`, sama seperti sekarang) dan baris kontrol/deskripsi di luar `aria-hidden`: tombol `ChevronLeft`/`ChevronRight` (nama aksesibel dari `labels`, area ≥ 44px, fokus terlihat), deskripsi (`key={activeId}` + animasi fade 250 ms, nama sebagai `Link`, `shortDescription` `line-clamp-3`, tinggi minimum tetap), disembunyikan `visibility: hidden` selama `data-ready="false"` (CSS). Posisi desktop: **di dalam tinggi stage 748 px**, absolut di bawah-tengah (`z-30`, lebar ±50% stage) di atas zona gradien pudar hero, tanpa menambah tinggi hero; mobile: di aliran normal di bawah stage (`mt-4`). `n=1`: tanpa tombol dan tanpa timer; `n=0`: `HomeHero` tidak merender stage seperti sekarang. `shortDescription` kosong → paragraf tidak dirender.
- [ ] **Step 6: Implementasi `HomeHero`** — petakan `showcase` → `HeroApp[]` (`href: appHref(slug, locale)`, `image: toImageSource(firstMedia(app.screenshots), format(dict.app.screenshotAlt, { name, index: 1 }))`), `labels` dari kamus; pertahankan section, glow, `data-story`, `story-pin`, dan track `story-spacer` apa adanya. Tambah kunci kamus EN/ID dan CSS (`.hero-track`: `transition: none` default; saat `[data-slide]` → `transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1)` dengan delay 0/60/120 ms per `[data-slot]` left/center/right; komentar "KEEP IN SYNC dengan heroCarouselModel.ts").
- [ ] **Step 7: Verifikasi** — `pnpm exec tsc --noEmit`, `pnpm lint`, tes e2e baru PASS, dan `pnpm test:e2e tests/e2e/home-scroll-story.e2e.spec.ts` + `tests/e2e/kct-hub.e2e.spec.ts` + `tests/e2e/frontend.e2e.spec.ts` tetap PASS tanpa perubahan pada berkas tes tsb. Cek visual di browser (screenshot) pada 1366×768, 1440×900, 1920×1080, 390×844: deskripsi dan kedua tombol terlihat penuh tanpa tabrakan dengan HP tengah/teks hero; hero tidak bertambah tinggi di desktop. **Bila deskripsi tidak muat tanpa menambah tinggi hero, berhenti dan laporkan ukuran terukur ke pengguna sebelum mengubah tinggi.**
- [ ] **Step 8: Commit** (setelah disetujui): `feat: carousel layar HP di hero dengan navigasi, deskripsi, dan tautan detail`.

### Task 4: Autoplay (jeda, hover, fokus keyboard, tab tersembunyi, di luar layar, reduced motion)

**Files:**
- Create: `src/components/home/useHeroAutoplay.ts` (`'use client'` hook)
- Modify: `src/components/home/HeroStage.tsx`
- Modify: `tests/e2e/home-hero-carousel.e2e.spec.ts`

**Interfaces:**
- Consumes: `isAutoplayRunning`, `HERO_AUTOPLAY_MS`, `AutoplayState` (Task 2); `go` dan `active` dari `HeroStage` (Task 3).
- Produces: `useHeroAutoplay(options: { rootRef: React.RefObject<HTMLElement | null>; count: number; userPaused: boolean; interacting: boolean; resetKey: number; onTick: () => void }): { reducedMotion: boolean; running: boolean }`.

- [ ] **Step 1: Tulis tes e2e gagal** (memakai `page.clock.install()` sebelum `goto`, tunggu `data-ready="true"`, lalu `page.clock.runFor(...)`; bila hidrasi tersendat oleh jam palsu, pasang jam setelah `data-ready`): (a) `runFor(5000)` → `data-active-index` maju 1; (b) hover di stage lalu `runFor(15000)` → tidak berubah, kursor keluar → lanjut; (c) fokus keyboard (Tab ke tombol) menjeda, tetapi klik mouse pada tombol lalu kursor keluar → autoplay lanjut; (d) tombol jeda (`Pause slideshow`) menghentikan dan berganti nama `Start slideshow`, menekan lagi melanjutkan; (e) klik manual mereset hitungan mundur (5 detik penuh sesudahnya); (f) `emulateMedia({ reducedMotion: 'reduce' })` → tidak ada autoplay dan tombol jeda tidak tampil, navigasi manual berpindah seketika; (g) tab tersembunyi (`document.hidden` dipalsukan + event `visibilitychange`) tidak menumpuk tick: setelah kembali tampil, `runFor(20000)` hanya memajukan sesuai hitungan wajar (≤ 4 langkah, bukan akumulasi tertunda); (h) hero keluar layar (`scrollTo` jauh) menghentikan, kembali ke atas melanjutkan; (i) berpindah halaman lalu kembali tidak menimbulkan error konsol.
- [ ] **Step 2: Jalankan, pastikan gagal** — `pnpm test:e2e tests/e2e/home-hero-carousel.e2e.spec.ts` → tes autoplay FAIL.
- [ ] **Step 3: Implementasi `useHeroAutoplay`** — satu `setTimeout` berantai (bukan `setInterval`) yang dijadwal ulang tiap `resetKey` berubah atau status berjalan berubah; sinyal: `matchMedia('(prefers-reduced-motion: reduce)')` + listener `change`, `document.visibilityState` + `visibilitychange`, `IntersectionObserver` pada `rootRef` (ambang 0.25); semua dibersihkan saat unmount.
- [ ] **Step 4: Implementasi di `HeroStage`** — state `userPaused` (tombol jeda/putar `Pause`/`Play` di baris kontrol, disembunyikan saat `reducedMotion` atau `n<2`), `interacting` = hover mouse (`onPointerEnter/Leave` dengan `pointerType === 'mouse'`) atau fokus keyboard (`onFocusCapture` hanya bila `target.matches(':focus-visible')`, `onBlurCapture` bila `relatedTarget` di luar grup); `aria-live` = `off` saat autoplay berjalan, `polite` selain itu; `onTick` memanggil `go('next')`.
- [ ] **Step 5: Verifikasi** — tes e2e PASS, tsc, lint; konsol bersih saat navigasi bolak-balik ke `/apps/<slug>` (tanpa timer bocor/warning React).
- [ ] **Step 6: Commit** (setelah disetujui): `feat: autoplay carousel hero dengan jeda dan pengaman aksesibilitas`.

### Task 5: Swipe sentuh

**Files:**
- Modify: `src/components/home/HeroStage.tsx`
- Modify: `tests/e2e/home-hero-carousel.e2e.spec.ts`

**Interfaces:**
- Consumes: `swipeDirection`, `HERO_SWIPE_PX` (Task 2).

- [ ] **Step 1: Tulis tes e2e gagal** (context `hasTouch: true`, viewport 390×844; swipe disimulasikan dengan dispatch `PointerEvent` `pointerType: 'touch'` lewat `page.evaluate`): swipe ke kiri 80 px → `next` dan URL tetap `/`; swipe ke kanan → `prev`; geseran 20 px → tidak berpindah; geseran dominan vertikal → tidak berpindah; ketukan (tap) pada HP → navigasi ke `/apps/<slug>`; swipe saat transisi berjalan diabaikan; `touch-action` stage terhitung `pan-y`.
- [ ] **Step 2: Jalankan, pastikan gagal** — tes swipe FAIL.
- [ ] **Step 3: Implementasi** di `HeroStage`: pada div phones tambahkan `touch-pan-y` dan handler `onPointerDown/Up/Cancel` (hanya `pointerType` `touch`/`pen`); `swipeDirection(dx, dy)` memanggil `go`; bila swipe terdeteksi, set penanda `suppressClick` yang membuat `onClickCapture` pada container memanggil `preventDefault` + `stopPropagation` untuk klik berikutnya (penanda dibersihkan segera setelahnya).
- [ ] **Step 4: Verifikasi** — tes e2e PASS; uji manual di emulasi mobile: scroll vertikal tidak terganggu.
- [ ] **Step 5: Commit** (setelah disetujui): `feat: swipe sentuh pada carousel hero`.

### Task 6: Variasi data via CMS, dokumentasi, dan verifikasi akhir

**Files:**
- Modify: `tests/e2e/home-hero-carousel.e2e.spec.ts` (describe "CMS-driven counts")
- Modify: `CLAUDE.md` (satu butir di "Hal yang sering keliru")

- [ ] **Step 1: Tulis tes e2e variasi jumlah** — masuk lewat `POST /api/users/login` (user dari `tests/helpers/seedUser.ts`), baca nilai awal `hero.showcaseApps`, ubah lewat `POST /api/globals/home` ke: 1 app → tanpa tombol dan tanpa timer (tidak ada perubahan setelah `runFor(20000)`); 2 app → dua HP, tombol bekerja dan wrap; 8 app → 8× next kembali ke awal, tidak lebih dari 5 URL gambar berbeda diminta setelah beberapa putaran; id app ganda dipilih dua kali → hanya satu kemunculan. Pulihkan nilai awal di `finally`. `revalidateHome` memakai `revalidateTag(..., 'max')` (stale-while-revalidate) → gunakan `expect.poll` + `page.reload()` sampai jumlah yang diharapkan muncul; verifikasi saat implementasi apakah update parsial grup `hero` menggabungkan field lain (bila tidak, kirim seluruh grup `hero` yang dibaca sebelumnya).
- [ ] **Step 2: Jalankan** — tes PASS; bila perlu penyesuaian harness, perbaiki tes (jangan melemahkan assertion).
- [ ] **Step 3: Dokumentasi** — tambah satu butir di `CLAUDE.md` "Hal yang sering keliru": carousel hero (`HeroStage`/`HeroPhone`/`heroCarouselModel.ts`; `HERO_SHOWCASE_MAX`; interaktif di luar `aria-hidden`; layar bergeser di dalam node `phone-*` sehingga tidak menyentuh `transform` GSAP; durasi CSS harus sama dengan `heroCarouselModel.ts`).
- [ ] **Step 4: Verifikasi akhir penuh** — `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm exec prettier --check` pada berkas yang diubah, `pnpm test:int`, `pnpm test:e2e`, `pnpm build`; checklist SEO CLAUDE.md untuk `/` dan `/id` (view-source: title, description, canonical, hreflang, JSON-LD tidak berubah; satu `<h1>`; deskripsi + tautan HP ada di HTML SSR). Lighthouse mobile `/` dibandingkan baseline Task 1: LCP tidak memburuk, CLS tetap < 0,1, Performance ≥ 90, A11y/SEO ≥ 95. Periksa Network: ≤ 5 gambar showcase berbeda diminta.
- [ ] **Step 5: Tinjau diff sendiri** — `git diff` dibaca untuk regresi (khususnya `HomeHero.tsx`, `PhoneFrame.tsx`), lalu laporan akhir (perubahan, berkas, hasil verifikasi termasuk SEO, risiko).
- [ ] **Step 6: Commit** (setelah disetujui): `test: variasi jumlah app pada carousel hero` dan `docs: catatan carousel hero di CLAUDE.md`.
