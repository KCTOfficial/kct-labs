# Hero fluid + halaman detail app (field CMS, picker ikon, warna aksen) — design

Status: pemilik meminta lanjut ke rencana implementasi (`/superpowers:writing-plans`); belum ada kode produk yang diubah.

**Baseline kode = `origin/master` (`ba572f2`)**, yang sudah memuat PR #1 (`feat/locale-carousel-theme-fluid`:
hero statis tanpa GSAP, carousel per-app dengan kartu deskripsi, tema logo navy/lime/oranye, ukuran fluid,
locale default **Indonesia**) dan PR #2. Draf `2026-11-26-locale-carousel-theme-fluid-design.md` sudah **dikerjakan dan
di-merge**; dokumen ini dibangun di atasnya. Versi pertama dokumen ini keliru memakai `master` lokal (tertinggal
2 merge) sebagai baseline; semua rujukan kode di bawah sudah dikoreksi terhadap `origin/master`.

## Maksud

Pemilik ingin dua hal, tanpa mengubah business logic atau hasil data:

1. Hero Beranda tampil seimbang di semua resolusi. Sekarang kartu deskripsi terlihat membengkak dibanding
   tiga HP di layar besar.
2. Halaman detail app mengikuti `design/app-detail.png`, dengan semua bagian baru dikelola di admin
   (opsi 2 pilihan pemilik), ikon bisa dipilih lewat popup bergambar, dan tiap app punya warna aksen sendiri.

## Temuan yang mendasari (terukur, bukan dugaan)

Diukur di dev server (worktree `origin/master`), CSS px, DPR 1:

| Viewport | `--hero-stage-h` | Grup HP (lebar) | Kartu deskripsi |
|---|---|---|---|
| 1920×940 | 717 | 662 | 464×128 (teks 14px) |
| 2560×1300 | 748 (batas atas) | 700 | 464×128 |
| 1536×752 (= 1920×940 pada skala 125%, ukuran di screenshot pemilik) | ±527 | ±432 | 464×128 |

- Stage hero sudah mengikuti tinggi layar: `--hero-stage-h: clamp(26rem, 100svh − --story-top − 9rem, 46.75rem)` dan
  `--hero-phones-w: (stage − 10.625rem) × 1.2111` ([globals.css](../../../src/app/(frontend)/globals.css)).
  **Yang tidak ikut skala adalah kartu deskripsi**: [HeroCaptionCard.tsx](../../../src/components/home/HeroCaptionCard.tsx)
  tingginya `h-32` (8rem) dan lebarnya `min(100%, 29rem)`, teksnya `text-sm`/`text-base` (semua rem tetap), dan root
  carousel memakai `lg:w-[max(var(--hero-phones-w),29rem)]` ([HeroStage.tsx](../../../src/components/home/HeroStage.tsx)).
  Saat layar pendek, grup HP mengecil (±432px di 1536×752) sementara kartu tetap 464px: **kartu menjadi lebih lebar dari
  ketiga HP** dan teksnya terlihat raksasa. Itulah komposisi di screenshot pemilik (1920×940 pada skala 125%).
- Halaman detail ([apps/[slug]/page.tsx](../../../src/app/(frontend)/[locale]/apps/[slug]/page.tsx)) hanya punya:
  header + baris spec, galeri screenshot, `description` rich text, `features` (`label` saja), panel
  "App information" (legal, email), dan app terkait. Tidak ada strip highlight, "How It Works",
  fitur berikon, banner data, maupun warna per app.
- Pola ikon sudah ada: [iconSelect.ts](../../../src/fields/iconSelect.ts) (20 nama, field `select`) +
  [SiteIcon.tsx](../../../src/components/site/SiteIcon.tsx) (peta nama → komponen Lucide, fallback `sparkles`),
  dipakai Home. Dokumen legal punya versi sendiri (`LEGAL_ICONS`, 6 nama).
- `lucide-react` 0.563 sudah terpasang (turunan Feather). Semua ikon di referensi tersedia di Lucide.
- `getAppBySlug` sudah `depth: 2`, ber-cache dengan tag. Field upload baru di dalam array ikut ter-populate
  tanpa query tambahan.

## Tujuan

**T1 — Hero stabil di semua resolusi**
1. Kartu deskripsi (lebar, tinggi, padding, ikon, teks) diskalakan dari **variabel stage yang sudah ada**
   (`--hero-stage-h` / `--hero-phones-w`), sehingga rasio kartu terhadap tiga HP sama di semua viewport desktop.
2. Kartu tidak pernah lebih lebar dari grup HP dan teksnya tidak pernah di bawah batas baca (≥ 12px) maupun
   raksasa; tinggi kartu tetap satu nilai per viewport (tanpa CLS saat berganti app).
3. Semua jaminan `tests/e2e/fluid-layout.e2e.spec.ts` yang ada tetap berlaku (tidak terpotong, tanpa overflow
   horizontal, kartu tidak menutup HP tengah > 16px); mobile tampil seperti sekarang.

**T2 — Detail app mengikuti referensi, dikelola di CMS**
1. Bagian baru, berurutan seperti referensi: hero dengan tiga HP · strip (ikon app + 3 highlight berikon) ·
   How It Works · Key Features (grid kartu berikon) · banner "Your Data, Your Control" · More apps (baris).
2. Field baru di collection `Apps` (semua opsional, terlokalisasi); bagian yang kosong **tidak dirender**.
3. Warna aksen per app dari **preset** yang dipetakan ke token CSS.
4. Picker ikon berupa popup di admin (grid ikon, kolom cari, pratinjau) yang dipakai ulang oleh semua field ikon.
5. Seed idempoten mengisi draf konten untuk app yang ada.

## Bukan tujuan

- Tidak mengubah business logic query app, hook revalidasi, access control, slug/URL, JSON-LD, metadata SEO,
  quick-view, listing, atau halaman legal.
- Tidak memasang dependensi baru (Font Awesome/Feather tidak perlu; Lucide cukup).
- Tidak mengubah header/footer global, carousel (autoplay, swipe, tombol), maupun scroll story GSAP di Beranda.
- Tidak mengubah `design/kct-hub.pen` (builder melaporkan selisihnya).
- Tidak mengubah ikon dokumen legal (`DocumentTypes`): tipe datanya berbeda dan tidak diminta. Dilaporkan sebagai
  tindak lanjut opsional.
- Tidak ada deteksi warna otomatis dari ikon app.

## Anti-goal (dianggap gagal walau fitur "jalan")

- App lama (7 app) tampil rusak/kosong setelah migrasi, atau teks `description`/legal/galeri/spec hilang dari halaman.
- Ada hex warna di komponen; kontras teks < AA di salah satu tema (terang/gelap) untuk salah satu preset warna.
- Bundle halaman publik membawa seluruh ikon Lucide; bundle admin memuat ikon sebelum picker dibuka.
- Hero berubah perilaku carousel/animasi, atau CLS ≥ 0,1, atau LCP memburuk.
- Dua `<h1>`, urutan heading rusak, atau konten penting hanya di client.
- Migrasi menghapus/mengubah data lama, atau tidak bisa di-rollback.

## Batasan

Production-ready; backward compatible; performa tetap baik saat jumlah app dan screenshot membesar (tanpa N+1,
tanpa query tambahan di halaman detail); CLAUDE.md (SEO checklist, Tailwind token, tanpa inline style/hex, Local API).
Konfirmasi pemilik **wajib** sebelum: membuat/menjalankan migrasi, menjalankan seed, mengubah CLAUDE.md,
commit. Pemilik sudah menyetujui perubahan skema `Apps` lewat dokumen ini; **eksekusi migrasi tetap minta konfirmasi**.

## Pendekatan

### T1 — dipilih: satu unit skala (A)

| | Cara | Catatan |
|---|---|---|
| **A** | **Stage dan kartu diskalakan dari satu `--hero-u`** | **Dipilih.** Rasio terjamin; perubahan kecil; hanya hero. |
| B | Kartu dipindah ke bawah stage, ukuran lain tetap | Ditolak: komposisi layar lebar tetap kecil dan kosong di sisi. |
| C | Container dilebarkan, stage melar sampai ±1100px | Ditolak: HP terlalu besar di 2560; risiko LCP/ukuran gambar. |

### T2 — dipilih: field eksplisit di `Apps` + komponen per bagian (A)

| | Cara | Catatan |
|---|---|---|
| **A** | **Field terstruktur opsional di `Apps`, komponen per bagian, picker ikon tunggal** | **Dipilih.** Sesuai pola repo; tervalidasi; satu migrasi aditif. |
| B | Satu field JSON bebas | Ditolak: tanpa validasi/UI admin, sulit dilokalisasi. |
| C | Collection terpisah untuk highlight/langkah/fitur | Ditolak: join/query tambahan untuk ≤12 baris per app. |

## Rancangan T1 (rincian yang sudah diputuskan)

- Tidak ada variabel baru yang wajib: `--hero-stage-h` dan `--hero-phones-w` sudah ada. Ditambahkan variabel turunan di
  `:root` (nama dipilih builder, mis. `--hero-card-w`, `--hero-card-h`, `--hero-card-text`) yang dihitung dari
  `--hero-phones-w`/`--hero-stage-h`; `HeroCaptionCard` dan wrapper kontrolnya di `HeroStage` memakainya.
- Kartu: lebar ≤ lebar grup HP; tinggi dan `font-size` mengikuti stage dengan `clamp()` (teks ≥ 12px dan ≤ 16px);
  `line-clamp` (nama 1 baris, deskripsi 3 baris) dan tinggi terkunci per viewport tetap. Ikon app tetap 56px
  (prop `size` ditentukan di server, tidak bisa bergantung viewport); tinggi minimum kartu dipilih agar ikon tetap muat.
- Root carousel: `lg:w-[max(var(--hero-phones-w),29rem)]` diganti agar tidak lagi memaksa lebar minimum 29rem
  di atas lebar grup HP (itu yang membuat kartu lebih lebar dari HP); `--hero-phones-w`'s offset `10.625rem` (tinggi
  kartu + jarak + kontrol) diperbarui bila tinggi kartu berubah, agar kartu tetap hanya menyentuh ≤ 16px HP tengah.
- Mobile (< `lg`) **tidak diubah**: `h-[380px]`, `max-w-[343px]`, kartu di bawah stage.
- Tidak menyentuh pose HP, `HeroPhone`, `heroCarouselModel`, `useHeroAutoplay`, `HeroProgress`, durasi `.hero-track`,
  atau scroll story section lain (hero sudah statis, tidak ada pin/GSAP di hero).
- Validasi: perluas `tests/e2e/fluid-layout.e2e.spec.ts` (daftar viewport + invarian baru: lebar kartu ≤ lebar grup HP,
  tinggi kartu ≤ 20% tinggi stage, teks kartu ≥ 12px) termasuk **1536×752** (viewport CSS dari screenshot pemilik),
  3440×1440, dan 1280×624; tes lama tidak dilemahkan. CLS < 0,1.

## Rancangan T2 (rincian yang sudah diputuskan)

### Skema `Apps` (semua opsional; teks terlokalisasi; **aditif**)

| Field | Bentuk | Batas | Catatan |
|---|---|---|---|
| `accentColor` | `text` + `validate` daftar putih, `localized: false` | — | 12 preset: `blue`, `sky`, `cyan`, `teal`, `green`, `lime`, `amber`, `orange`, `red`, `rose`, `pink`, `purple` (+ `indigo` bila lolos AA; builder boleh menyesuaikan jumlah, minimal 12). Kosong = warna brand. Bukan `select`/enum agar preset baru kelak tidak butuh migrasi; daftar append-only. |
| `highlights` | array: `icon`, `title`, `description` | maks 3 | Strip di bawah hero. `title` ≤ 40, `description` ≤ 60. |
| `howItWorks` | grup: `title`, `description`, `steps[]` | langkah maks 4 | Langkah: `title` ≤ 60, `description` ≤ 140, `image` (upload Media, opsional). Dirender bila ada ≥ 1 langkah. |
| `featuresIntro` | grup: `title`, `description` | — | Judul/teks pengantar Key Features; kosong → pakai kamus UI (`detail.keyFeatures`). |
| `features[]` (sudah ada) | tambah `icon`, `description` | maks 12 (tetap) | `label` **tidak berubah**. Fitur lama tanpa ikon memakai ikon default (`check`). |
| `dataControl` | grup: `title`, `description` | — | Banner. Dirender bila `title` **dan** `description` terisi. Tautan "Learn More" = indeks legal app (`legalIndexPath`) bila ada dokumen legal terbit; **tanpa field URL bebas** (tidak ada risiko tautan berbahaya). |

- `icon` pada field baru: `type: 'text'` dengan `validate` terhadap daftar putih (bukan `select`) — daftar bisa
  bertambah tanpa migrasi baru. Nilai kosong sah.
- Field teks terlokalisasi memakai `requiredInDefaultLocale(defaultLocale)` hanya **di dalam baris yang ada**
  (mis. baris highlight wajib punya `title`); tidak ada `defaultLocale` yang di-hardcode.
- Letak di admin: tab baru **"Page sections"** (agar tab Details/Media tidak membengkak); `accentColor` di tab Overview.
- `defaultPopulate` (kartu/listing/hero) **tidak diubah** — field baru tidak ikut query kartu.
- `payload-types.ts` di-generate ulang (`pnpm generate:types`), tidak diedit manual.

### Migrasi

- Satu migrasi aditif via `pnpm payload migrate:create` (tabel/kolom baru untuk tabel utama, `_locales`, dan versi
  `_apps_v*` karena drafts aktif). Tanpa `DROP`/`ALTER` kolom lama. `down` ditulis dan diuji pada DB salinan.
- Builder **meminta konfirmasi pemilik** sebelum membuat dan sebelum menjalankan. Hasil SQL ditinjau (tidak ada
  perubahan pada Home/Pages/Posts); catat di `docs/DEPLOYMENT.md`. Catatan: `deploy/deploy.sh` menjalankan migrasi
  otomatis sebelum build (DEPLOYMENT.md bagian F), jadi backup DB produksi **sebelum deploy** wajib.
- [ASSUMPTION] Select Home menjadi enum Postgres bawaan Payload; karena itu Home **tidak diubah tipenya** (lihat picker).
  Dasar: perilaku Payload untuk `type: 'select'`. Builder memverifikasi lewat JSON migrasi yang ada.

### Picker ikon (admin)

- Satu komponen client `IconPickerField` (field kustom Payload, `admin.components.Field`) memakai `useField`.
  Tombol berpratinjau ikon terpilih + nama; klik membuka modal (komponen modal/drawer `@payloadcms/ui`, fokus-trap bawaan)
  berisi kolom cari (nama + kata kunci), grid ikon ber-label, tombol "Hapus pilihan", navigasi keyboard, `aria-label`.
- Sumber tunggal: daftar nama ±150 ikon relevan untuk app (diperluas dari 20; **20 nama lama tetap ada** agar data Home
  tidak yatim) di satu modul; `SiteIcon` memetakan nama → komponen dengan tipe `Record<SiteIconName, LucideIcon>`
  sehingga TypeScript memaksa sinkron. Nama tak dikenal → fallback ikon, tidak crash.
- Home tetap `select` 20 nama (tanpa migrasi) tetapi memakai popup yang sama dengan daftar 20 itu (`names` prop).
  [ASSUMPTION/keputusan builder-ringan] kalau picker ternyata tidak bisa membungkus `select` Home tanpa efek samping,
  Home dibiarkan seperti sekarang dan dilaporkan.
- Performa: komponen `SiteIcon` dan peta ikon **hanya dipakai di Server Component** frontend (tidak ada JS ikon yang
  dikirim ke pengunjung). Modul peta ikon tidak boleh diimpor Client Component publik. Picker di-load lazy di admin.
- Validasi sisi server: `validate` memeriksa nilai terhadap daftar putih (menolak input langsung via API).

### Warna aksen

- **UI admin:** komponen client `AccentColorField` (field kustom) menampilkan **grid kotak warna** (radio group, satu
  kotak per preset, label nama, tanda centang pada pilihan, opsi "Brand (default)"), bukan dropdown teks. Dapat
  dioperasikan keyboard, dengan `aria-label` nama warna. Kotak warna memakai token yang sama dengan frontend
  (tema admin: nilai gelap). Daftar preset satu sumber dengan `validate` dan `globals.css`.
- `data-accent="<preset>"` pada `<article>`; `globals.css` mendefinisikan `--app-accent`, `--app-accent-soft`,
  `--app-accent-glow` per preset **per tema** (terang, gelap, dan blok `prefers-color-scheme` yang sudah duplikat).
  Tanpa preset → turunan dari token brand (`--primary`). Komponen hanya memakai token (tanpa hex).
- Kontras: setiap pasangan teks/latar ≥ 4,5:1 (teks), ≥ 3:1 (UI/ikon besar) untuk 12+ preset × 2 tema,
  dibuktikan skrip uji (bukan perkiraan). Preset yang gagal disesuaikan nilainya, bukan dilonggarkan standarnya.

### Halaman detail (urutan dan perilaku)

1. **Hero**: breadcrumb, chip kategori, nama (`<h1>`, tetap satu), tagline, tombol Play Store dan Share, dan tiga HP
   dari screenshot app dengan pose statis (kiri = screenshot 2, tengah = 1, kanan = 3; 2 screenshot → kiri+tengah;
   1 → tengah; 0 → tanpa HP, teks lebar penuh). Tanpa carousel dan tanpa GSAP. Gambar `next/image` dengan ukuran
   turunan Media, hanya HP tengah `priority` (LCP); tidak ada perubahan aturan `images.localPatterns`.
2. **Strip**: ikon app + nama + kategori, lalu 0–3 highlight berikon. Tanpa highlight → hanya blok app.
3. **Spec** (kategori/unduhan/usia/platform/developer): **tetap dirender** (isi sama) — baris ringkas di bawah strip.
4. **How It Works** (≥ 1 langkah): judul/teks dari `howItWorks`, langkah bernomor dengan gambar opsional, tombol
   "Explore All Features" = tautan anchor ke `#features` (label dari kamus UI).
5. **Key Features**: `<h2>` dengan teks `featuresIntro` atau fallback kamus; grid kartu (ikon, `label`, `description`);
   responsif 3 → 2 → 1 kolom.
6. **Banner data** (bila terisi) dengan tautan ke indeks legal bila ada.
7. **Tetap, dipindah ke bawah bagian baru**: galeri screenshot (lightbox), "About" (rich text/`shortDescription`),
   panel "App information" (package ID, spec tambahan, tautan legal, email dukungan).
8. **More apps from KCT**: tetap `RELATED_LIMIT = 3` dan sumber data sama; tampilan jadi baris (ikon, nama, deskripsi,
   chip kategori, "View details") seperti referensi.
9. Bar Play Store lengket di mobile tetap.

- Heading: satu `<h1>`; semua bagian baru `<h2>`; tanpa loncat level. JSON-LD/metadata/canonical/hreflang tidak berubah.
- Mobile/tablet: strip menumpuk vertikal, langkah menumpuk, grid fitur 1–2 kolom; tidak ada scroll horizontal halaman.
- Tema terang: reference hanya gelap; terang dirancang dari token yang sama dan diuji kontrasnya.
- Edge: teks sangat panjang (clamp/`break-words`), baris dengan ikon kosong, gambar langkah hilang/tanpa alt
  (alt dari `title` langkah), app tanpa kategori, ID tanpa terjemahan (fallback EN via Payload), draft/preview.

### Seed konten

- Perluas `src/endpoints/seed/kct/content.ts` dan `index.ts` **hanya dengan yang bisa diturunkan dari fakta yang
  sudah ada** di `content.ts` (tagline, deskripsi, label fitur): `accentColor` per app, ikon untuk `features`,
  dan `highlights` dari tiga fitur pertama. Idempoten dan **hanya menulis yang belum disentuh editor**: `highlights`
  hanya bila belum ada baris, `accentColor` hanya bila kosong, dan `features` dilewati seluruhnya (label juga) begitu
  editor mengubahnya (jumlah baris, ikon lain dari seed, atau deskripsi). Tidak ada klaim yang dikarang (aturan "jangan mengarang" di CLAUDE.md).
- `howItWorks`, `featuresIntro`, deskripsi tiap fitur, dan `dataControl` **tidak diisi seed** (faktanya tidak ada di
  data): bagian itu tersembunyi sampai pemilik/editor mengisinya di admin. Isi teks dari pemilik (lihat "Keputusan
  setelah builder check") bisa dimasukkan ke seed bila diberikan.
- Builder **meminta konfirmasi** sebelum menjalankan seed, lalu `POST /api/apps/revalidate`.

## Asumsi dan rekomendasi (semua bisa diubah pemilik)

| # | Asumsi | Rekomendasi |
|---|---|---|
| 1 | "More apps" referensi menampilkan satu baris, sedangkan data terkait maks 3 | Tampilkan sampai 3 baris bertumpuk; sumber data dan batas tidak berubah. |
| 2 | Maksimum 3 highlight dan 4 langkah | Ikuti referensi (3 dan 3–4); batas bisa dinaikkan nanti tanpa migrasi (hanya `maxRows`). |
| 3 | Judul "Explore All Features" mengarah ke `#features` | Anchor internal; tanpa field URL baru. |
| 4 | Warna aksen kosong = warna brand | Aman untuk app lama; tidak ada perubahan visual sampai editor memilih. |
| 5 | Ikon tersimpan sebagai string (bukan relasi/upload) | Ringan, tanpa join, tervalidasi daftar putih. |
| 6 | Banner data memakai indeks legal app, bukan URL bebas | Menghindari input URL tak tervalidasi. |
| 7 | Spec/About/Info/Galeri tetap tampil | Menjaga "hasil tidak berubah" dan konten SEO. |
| 8 | Lokalisasi konten baru: ID default (`defaultLocale`), fallback ID→EN | Memakai konstanta `defaultLocale`; tidak ada hardcode. |

## Keputusan setelah builder check (keputusan saya, bisa diubah pemilik)

- **Sumber kebenaran visual:** `design/app-detail.png` (ada di folder `design/`, belum di-commit). Penyimpangan yang disengaja dari gambar:
  spec ringkas tetap dirender (isi hasil sama), More apps sampai 3 baris, dan tema terang dirancang sendiri dari token.
  Highlight dan langkah **hanya** membawa `icon`/`title`/`description` (langkah: `title`/`description`/`image`);
  tidak ada atribut lain di gambar.
- **Hero halaman detail ≠ hero Beranda:** komponen server terpisah (`next/image` + class pose statis), **tidak**
  memakai `HeroPhone`/`HeroStage` atau variabel `--hero-*` milik Beranda. Ukurannya fluid dengan `clamp()` dan
  token fluid yang sudah ada (`--space-gutter`, `--section-y`, `text-title`). T1 dan T2 tidak saling bergantung.
- **Locale default sekarang Indonesia** (`defaultLocale = 'id'`, fallback `id → en`, EN berprefix `/en`): validator
  `requiredInDefaultLocale(defaultLocale)` otomatis mewajibkan ID; seed menulis EN dan ID.
- **Migrasi:** dikembangkan terhadap DB lokal (dev memakai schema push) dan diuji `up`/`down` pada DB baru yang
  dibangun dari migrasi baseline. Membuat DB sementara itu butuh konfirmasi. Migrasi produksi dijalankan pemilik lewat
  langkah deploy yang didokumentasikan di `docs/DEPLOYMENT.md`; builder tidak menyentuh produksi.
- **Ikon tidak dilokalisasi:** `icon` memakai `localized: false` (satu nilai untuk semua locale). Daftar nama ikon
  **hanya bertambah (append-only)**; ada tes yang gagal bila nama lama hilang, sehingga dokumen tersimpan tidak
  pernah gagal validasi karena daftar berubah.
- **Baseline kontras:** token yang sudah ada di `globals.css` per tema (`--background`, `--bg-raised`, `--surface`,
  `--surface-2`, `--foreground`, `--text-secondary`, `--text-muted`) termasuk blok `prefers-color-scheme` yang
  duplikat. Teks/ikon aksen diuji terhadap `--surface`, `--bg-raised`, dan `--background`.
- **Teks How It Works, banner data, deskripsi fitur, dan pengantar Key Features diisi editor di admin** (keputusan
  pemilik). Seed tidak mengisinya; bagian itu tersembunyi sampai terisi. Pemilik/editor perlu mengisi per app
  sebelum halaman setara referensi.
- **Banner data tanpa dokumen legal terbit:** tetap tampil tanpa tautan "Learn More" (judul + teks saja).

## Pengujian (metode validasi)

- **Unit (Vitest):** sinkron daftar nama ikon ↔ peta komponen; validator ikon (terima/tolak); pemetaan preset warna;
  pemilihan screenshot untuk HP (0/1/2/3/≥4); pemilihan bagian yang dirender (kosong → tersembunyi).
- **Integrasi (Vitest + Payload):** app lama tanpa field baru tetap valid dan dirender; field baru tersimpan per locale;
  fallback ID→EN; `validate` menolak ikon liar; migrasi up/down pada DB salinan.
- **E2E (Playwright):** halaman detail app ber-konten (semua bagian muncul berurutan, satu `<h1>`, alt gambar, canonical,
  hreflang, JSON-LD tetap), app tanpa konten baru (bagian tersembunyi, isi lama utuh), tema terang/gelap per preset,
  ukur hero di semua viewport T1, picker ikon di admin (buka, cari, pilih, simpan, hapus, keyboard).
- **Kontras:** skrip menghitung rasio untuk semua preset (12+) × 2 tema; gagal bila di bawah AA. Preset terang
  seperti `lime`/`amber` memakai nilai lebih gelap di tema terang agar teks aksen tetap terbaca.
- **Admin:** e2e `AccentColorField` (pilih, ganti, kembali ke brand, keyboard) dan penolakan nilai liar lewat API.
- **Lainnya:** `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, ukuran bundle halaman detail dibanding sebelum
  perubahan (tidak naik karena ikon), Lighthouse SEO/A11y ≥ 95 dan Performance ≥ 90 (mobile).
- Tes yang ada diperbarui bila markup berubah, **tidak dihapus/dilemahkan**.

## Urutan kerja (disarankan; tiap tahap bisa diverifikasi sendiri)

1. T1 hero fluid (terisolasi, tanpa skema) → 2. Registry ikon + picker (+ validasi) → 3. Skema `Apps` + `generate:types`
   (+ konfirmasi migrasi) → 4. Token warna aksen + uji kontras → 5. Komponen halaman detail per bagian → 6. Seed
   (+ konfirmasi) → 7. Tes, build, Lighthouse, dokumentasi (`docs/DEPLOYMENT.md`, `design/README.md`; CLAUDE.md dengan persetujuan).

## Diserahkan ke builder

- Nilai persis `clamp()` dan koefisien `--hero-u`; ambang "kartu menutup HP".
- Daftar ±150 nama ikon dan kata kuncinya; nilai hex tiap preset warna (12+, lolos AA di kedua tema).
- Nama/struktur komponen, grid dan jarak detail, tata letak mobile.
- Selisih desain `.pen` (dilaporkan), dan keputusan apakah picker juga dipakai Home (lihat catatan fallback).
