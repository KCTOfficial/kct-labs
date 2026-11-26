# Default locale ID, carousel per-app, tema logo, ukuran fluid — design

Status: draf, menunggu persetujuan pemilik. Belum ada kode produk yang diubah.

## Maksud

Pemilik ingin KCT Hub (a) berbahasa Indonesia secara default, (b) hero menampilkan satu aplikasi
penuh (3 screenshot-nya) per slide dengan kartu deskripsi dan indikator waktu, (c) memakai warna
logo KCT Hub di mode terang dan gelap, dan (d) tidak terpotong di berbagai ukuran layar.
Semua tanpa mengubah business logic atau hasil data.

## Tujuan

1. **Locale.** `/apps` = Indonesia, `/en/apps` = English, `/id/...` → 308 ke `/...`. Field ID yang kosong
   jatuh ke EN **per field**.
2. **Carousel.** Satu slide = satu aplikasi. Tiga HP = screenshot 1 (tengah), 2 (kiri), 3 (kanan), maks 3.
3. **Kartu deskripsi.** Ikon app, garis pemisah vertikal, nama, deskripsi, dalam kartu bergaris (screenshot 1 pemilik).
4. **Indikator.** Tombol play/pause dihapus. Satu segmen per aplikasi; yang aktif terisi sesuai sisa waktu ke app berikutnya.
5. **Fluid.** Hero muat di viewport (tidak terpotong), tipografi/padding/container/grid fluid di **semua halaman publik**.
6. **Tema.** Token warna dari logo (hex diambil dari `public/brand/*.png`).
7. **Hero statis.** Scroll story GSAP **hanya untuk hero** dihapus: HP, teks, cahaya latar tidak beranimasi
   saat scroll dan hero tidak lagi sticky. Bagian `featured`, `process`, `about`, `cta` tetap seperti sekarang.

## Bukan tujuan

- Tidak mengubah skema collection/global selain `localization` (tidak ada field baru, **tidak ada migrasi data**).
- Tidak deteksi bahasa otomatis (Accept-Language/IP): satu URL = satu bahasa (aman untuk SEO).
- Tidak mengubah business logic query app, hook, access control, validator selain locale default.
- Tidak menambah dependensi. Tidak mengubah logo (aset sudah sesuai).
- Tidak mengubah `design/kct-hub.pen` (lihat "Diserahkan ke builder").

## Anti-goal

- Halaman EN lama (`/apps`) tampil kosong/campur karena fallback salah.
- URL terindeks menjadi 404, loop redirect, atau canonical/hreflang tidak konsisten.
- LCP/CLS hero memburuk; indikator memicu re-render React 60×/detik.
- Autoplay tidak bisa dihentikan setelah tombol pause dihapus (WCAG 2.2.2).
- Kontras teks di bawah AA di salah satu tema.
- Hero masih terpotong pada viewport umum.

## Batasan

Production-ready; backward compatible; performa tetap baik saat data membesar (jumlah app,
screenshot); CLAUDE.md: SEO checklist, konfirmasi sebelum commit/migrasi/dependensi/ubah URL
(perubahan URL di sini **sudah disetujui pemilik**, opsi B).

## Pendekatan

### 1. Locale — dipilih: balik URL (B), fallback per locale

| | Cara | Catatan |
|---|---|---|
| A | URL tetap (`/apps`=EN), hanya pengunjung baru diarahkan ke ID | Tidak dipilih: bukan "default" sebenarnya; butuh deteksi → buruk untuk SEO. |
| **B** | **`defaultLocale = 'id'`, ID tanpa prefix, EN berprefix `/en`** | **Dipilih pemilik.** |

Rincian:
- `src/i18n/config.ts`: `defaultLocale = 'id'`. `routing.ts`/`proxy.ts`/`localizeHref`/`stripLocale` sudah generik terhadap `defaultLocale`; builder menambah tes.
- `payload.config.ts`: `localization.locales` → `{ code: 'id' }` dan `{ code: 'en', fallbackLocale: ... }` — **fallback**: `id` jatuh ke `en`
  (`fallbackLocale: 'en'` pada locale `id`, EN tanpa fallback). Fallback Payload dievaluasi per field.
- Validator `requiredInDefaultLocale(defaultLocale)` otomatis menjadi wajib-ID, EN opsional. Admin yang mengisi baru wajib mengisi ID.
- Dokumen legal: tetap **tanpa fallback otomatis** (`fallbackLocale: false`, `utilities/legal/queries.ts`); banner "belum diterjemahkan" tetap, sumbernya ID.
- Canonical, hreflang (`id`, `en`, `x-default` → ID tanpa prefix), sitemap, `<html lang>`, `og:locale`, JSON-LD memakai util yang sudah ada dan hanya terpengaruh `defaultLocale`.
- Redirect: `/id/*` → 308 ke `/*`. `/en/*` kini melayani EN (tidak lagi redirect). Pages/Posts non-localized tetap satu canonical.
- Tes: unit routing/localizeHref/hreflang; e2e redirect, `<html lang>`, canonical, hreflang, fallback field campur, legal.
- Risiko diketahui: URL EN yang terindeks (`/apps`) berubah bahasa; sinyal SEO perlu waktu menyesuaikan. Disetujui pemilik.
- Rilis: dokumentasikan di `docs/DEPLOYMENT.md`; setelah deploy panggil `/api/apps/revalidate` (cache tag) dan kirim ulang sitemap.

### 2–4. Carousel hero — dipilih: pertahankan arsitektur C (HP diam, layar bergeser), ubah unit slide

Unit slide berubah dari "app per HP" menjadi "tiga screenshot satu app per HP".
- Model murni (`heroCarouselModel.ts`): `stageAppIndexes` diganti pemilihan screenshot (`screensFor(app)`, maks 3, urutan [kiri=ss2, tengah=ss1, kanan=ss3]; 2 → dua HP; 1 → satu di tengah; 0 → app **dilewati** dari carousel dan indikator).
- Data: `HomeHero` meneruskan hingga 3 `ImageSource` per app (field `screenshots` sudah `hasMany`, maks 10); tidak ada perubahan skema. Query showcase mengambil `screenshots` yang sudah di-populate (`defaultPopulate`); tidak ada query baru (N+1 nol).
- Transisi: ketiga layar bergeser bersama (stagger yang ada dipertahankan). Prev/next dan swipe tetap.
- Kartu deskripsi: komponen kartu bergaris dengan `AppIcon` (komponen ada), pemisah vertikal, nama (link ke halaman app), deskripsi `line-clamp`. Tinggi terkunci (tidak ada CLS).
- Indikator: satu segmen per app (maks `HERO_SHOWCASE_MAX` = 8). Pengisian segmen aktif memakai **animasi CSS** (`transform: scaleX`, durasi `HERO_AUTOPLAY_MS`), bukan state React per frame. `animation-play-state: paused` saat hover/fokus keyboard/tab tersembunyi/di luar layar → isian membeku, tidak reset. `prefers-reduced-motion`: autoplay mati, indikator statis. Segmen dapat diklik (`<button>`, label aksesibel, `aria-current`).
- Aksesibilitas: tombol play/pause dihapus; pengganti WCAG 2.2.2 = jeda saat hover/fokus + reduced-motion; live region tetap `off` saat autoplay berjalan.
- Warna isian: **oranye aksen tema** (pemilik menulis "merah"; screenshot referensi oranye-merah) — keputusan builder yang bisa diubah pemilik.
- Performa: hanya layar app aktif + berikutnya yang dimuat (neighbour setelah idle), sisanya lazy; hanya ss1 app pertama `priority` (LCP). Jumlah app bertambah tidak menambah beban awal.
- Tes: unit model (0/1/2/3/4+ screenshot, wrap, app tanpa screenshot dilewati), e2e (3 HP milik satu app, segmen, jeda hover, tidak ada tombol pause, satu `<h1>`), tes e2e carousel lama diperbarui, bukan dilemahkan.

### 5. Ukuran fluid — dipilih: hibrida (C), semua halaman

Penyebab pemotongan: stage `lg:h-[748px]`/`max-w-[700px]`, kolom `600px`, sticky `story-pin` setinggi layar dengan `overflow-hidden`,
container tetap 1360px.
- Token fluid di `globals.css` (`clamp()` + `svh`): lebar container (naik hingga ±1600px di layar lebar), padding section, skala tipografi display/judul, gap grid.
- Hero: tinggi stage = `min(748px, 100svh − header − padding)`; lebar HP mengikuti tinggi (rasio tetap). Kolom teks fluid.
- Hero tidak lagi sticky (lihat bagian 7), jadi tidak ada hitungan "muat/tidak muat" untuk pin hero; hero cukup tidak boleh memotong konten. `PIN_QUERY` tetap untuk section `featured` (dicek ulang agar tidak terpotong).

### 7. Hero statis — dipilih: hapus scroll story hanya pada hero

- `scrollStory.ts`: hapus builder hero (`phone-left/center/right`, `hero-copy`, `hero-glow-a/b`). Builder section lain tidak disentuh; GSAP tetap di-`import()` dinamis untuk section itu.
- `HomeHero.tsx`: hapus `story-pin`, `data-story="hero"`, `data-story-track="hero"`, `story-spacer`, dan semua `data-story-part` hero. Hero menjadi `<section>` biasa; tidak ada pembungkus track.
- `HeroPhone`/`HeroStage`: `data-story-part="phone-*"` dihapus; `phoneSlot` dan konfigurasi slot di `scrollStoryConfig.ts` dibersihkan hanya bila tidak dipakai section lain.
- Pose HP (rotasi/posisi) tetap lewat class statis, sehingga tampilan awal sama dengan keadaan awal animasi sebelumnya (tidak ada lompatan visual).
- Tes: `home-scroll-story.e2e.spec.ts` dan `scrollStory.int.spec.ts` diperbarui — bagian hero diganti assertion "tidak sticky, tidak ada `data-story-part` di hero"; tes section lain tidak berubah. Tidak ada tes yang dihapus tanpa pengganti.
- Dokumentasi: perbarui catatan scroll story & carousel di `CLAUDE.md` dan `design/README.md` (menyebut hero tidak lagi dianimasikan GSAP) — dengan persetujuan pemilik karena CLAUDE.md berkas proyek.
- Manfaat: tanpa pin hero, tidak ada CLS dari sticky, dan hero tidak mungkin terpotong karena `min-height` viewport.
- Halaman lain (daftar app, detail app, legal, section Beranda, footer): memakai token yang sama menggantikan nilai px/`max-w` tetap yang paling sering terpotong (±24 kemunculan di `src/components`). Tidak ada perubahan struktur/markup selain kelas ukuran.
- Validasi: Playwright mengukur `getBoundingClientRect` — tidak ada elemen hero/section melewati batas viewport dan tidak ada overflow horizontal — pada 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080, 2560×1440, 768×1024, 390×844, plus zoom 125%/150% (setara viewport lebih kecil). CLS < 0,1, Lighthouse tetap ≥ batas CLAUDE.md.

### 6. Tema — dipilih: navy (terang) / lime (gelap), oranye aksen

Hex dari logo: lime `#CDF228`, oranye `#FF681A`, navy `#14213D`, putih tulang `#F2F1EE`.

| Token | Terang | Gelap |
|---|---|---|
| tombol utama / `--primary` | navy `#14213D`, teks putih | lime `#CDF228`, teks gelap |
| aksen / sorot / indikator | oranye (varian yang lolos AA untuk teks kecil) | oranye `#FF681A` |
| titik/badge kecil | lime | — |
| `--background`/`--surface` | netral hangat dari `#F2F1EE`/putih | dari navy gelap yang selaras logo |

- Ubah hanya token (`:root`, `[data-theme='dark']`, blok `prefers-color-scheme` duplikat); komponen tetap memakai token, tanpa hex di komponen (CLAUDE.md).
- Biru langit lama (`--brand-sky`, `--brand-navy` yang dipakai glow hero) diganti/diselaraskan; `--primary` lama dipakai di banyak komponen sehingga dicek satu per satu (fokus ring, link, chip status).
- Kontras: setiap pasangan teks/latar diuji ≥ 4,5:1 (teks), ≥ 3:1 (UI) di kedua tema, dibuktikan skrip uji (bukan perkiraan).
- Tes: e2e dua tema (`data-theme` + `prefers-color-scheme`), uji kontras otomatis token, pemeriksaan visual.

## Keputusan setelah builder check (keputusan saya, bisa diubah pemilik)

- **Arah fallback:** `id` → `en` (field ID kosong tampil EN). EN tanpa fallback. Tidak bertentangan dengan "wajib di locale default": fallback hanya mengisi tampilan, validasi memeriksa nilai asli.
- **Dampak admin:** dengan `requiredInDefaultLocale('id')`, dokumen lama yang hanya berisi EN akan gagal disimpan di tab locale ID sampai field ID diisi (tab EN tidak terpengaruh). Ini disengaja agar konten ID menjadi sumber utama; dicatat di docs/DEPLOYMENT.md.
- **Tidak ada migrasi data (terverifikasi dari kode):** Pages/Posts/Forms/Search memakai `withoutLocalization` (kolom non-locale, tidak terpengaruh default). Collection ber-locale menyimpan baris per locale (`*_locales`), jadi mengganti default tidak mengubah baris. Bukti saat implementasi: `payload migrate:create` (dry) harus menghasilkan diff kosong (butuh konfirmasi pemilik sebelum dijalankan).
- **Seed/rebrand:** `seed-kct` menulis `en` dan `id` eksplisit (`LOCALES`); `rebrand-content` membaca per locale tanpa fallback. Builder wajib mengaudit `locale: 'en'` yang di-hardcode (mis. `src/endpoints/seed/kct/index.ts:166`) dan seluruh 16 pemakai `defaultLocale`.
- **`/en/*`:** sebelumnya 308 ke `/*`; sekarang melayani EN. Entri `redirectsPlugin` berbasis path dan tidak bergantung locale, jadi tidak berubah. `x-default` → versi tanpa prefix (ID).
- **Kasus tepi carousel:** app tanpa screenshot dilewati. Semua app tanpa screenshot → hero tanpa stage (jalur "tidak ada HP" yang sudah ada). Hanya 1 app layak → tanpa segmen, panah, dan autoplay (perilaku `count < 2` yang ada). `priority` LCP jatuh ke app layak pertama.
- **Viewport pendek:** HP mengecil sampai tinggi minimum, sesudahnya hero **boleh lebih tinggi dari viewport dan di-scroll**; tidak ada `overflow-hidden` yang memotong konten (hanya dekorasi glow yang di-clip).
- **Cakupan fluid:** semua route publik di `[locale]` (kedua locale memakai kode sama), termasuk pencarian dan Pages/Posts. Aturan "tanpa perubahan markup" berlaku untuk halaman non-hero; hero memang mendapat markup baru (kartu, indikator).
- **Oranye:** isian indikator dan elemen besar/UI memakai oranye logo (cukup 3:1); **teks kecil** di mode terang memakai varian lebih gelap agar ≥ 4,5:1. Pemilik diminta melihat hasilnya.
- **`design/kct-hub.pen`:** builder melaporkan selisihnya; pemilik yang memutuskan menyelaraskan.

## Urutan kerja (disarankan, setiap tahap dapat diverifikasi sendiri)

1. Tema (token saja, paling terisolasi) → 2. Hero statis (hapus GSAP hero) → 3. Carousel → 4. Fluid (setelah carousel karena keduanya menyentuh tata letak `HeroStage`) → 5. Locale (paling berisiko, terakhir, dengan checklist deploy).
Satu tahap = satu perubahan utuh; commit hanya atas permintaan pemilik.

## Diserahkan ke builder

- Nilai persis token netral (background/surface) dan varian oranye teks yang lolos AA.
- Nama/struktur komponen kartu deskripsi dan indikator; angka clamp tepat.
- Apakah `design/kct-hub.pen` perlu diselaraskan (CLAUDE.md menyebut desain sebagai sumber token): **di luar lingkup** dokumen ini; builder melaporkan, pemilik memutuskan.
