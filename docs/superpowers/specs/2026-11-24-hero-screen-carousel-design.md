# Carousel layar HP di hero homepage — design

Status: draf, menunggu persetujuan. Belum ada kode produk yang diubah.

## Maksud

Hero homepage menampilkan 3 HP statis (kiri, tengah, kanan). Pemilik ingin tampilan yang lebih hidup:
layar HP bergeser otomatis ke app berikutnya dengan transisi (bukan lompat), ada tombol kiri/kanan,
dan di bawah tengah (kotak merah di screenshot pemilik) tampil short description app yang sedang
ada di HP tengah.

## Tujuan

- Layar ketiga HP bergeser horizontal ke app berikutnya/sebelumnya, otomatis tiap jeda tertentu dan lewat tombol kiri/kanan.
- Short description + nama app aktif (HP tengah) tampil di bawah tengah dan ikut berganti.
- Daftar app tetap dari field Admin `Showcase Apps` (`home.hero.showcaseApps`), fallback ke featured apps seperti sekarang.
- Performa tidak turun saat jumlah app bertambah; LCP, CLS, dan JS awal tidak memburuk.

## Bukan tujuan

- Tidak mengubah koleksi Apps, halaman app, quick-view, section Beranda lain, atau animasi scroll story (GSAP).
- Tidak menambah dependensi, tidak ada migrasi database.
- Tidak membuat HP-nya sendiri berpindah posisi (itu pendekatan A, tidak dipilih).

## Anti-goal (gagal walau secara teknis jalan)

- LCP atau CLS hero memburuk; screenshot sisi memperebutkan bandwidth dengan CSS/`<h1>`.
- Pergeseran terlihat lompat, kedip kosong, atau menumpuk saat tombol ditekan cepat.
- Carousel berputar tanpa bisa dihentikan (pelanggaran WCAG 2.2.2).
- Konten penting hilang dari HTML SSR atau ada dua `<h1>`.

## Pendekatan yang dipertimbangkan

| | Cara | Catatan |
|---|---|---|
| A | HP berpindah posisi (coverflow) | Paling mirip "HP bergeser", tapi bentrok dengan GSAP `phone-left/center/right`; efek scroll harus disederhanakan; tes e2e hero berubah. Tidak dipilih. |
| B | Library carousel (Embla/Swiper) | Dependensi baru, lebih berat, efek miring tetap ditulis sendiri. Tidak dipilih. |
| **C** | **HP diam, layarnya yang bergeser** | **Dipilih pemilik.** GSAP dan tes e2e hero tidak tersentuh; kerja dan risiko paling kecil. |

## Desain (pendekatan C)

### Data (tanpa mengubah logika bisnis)

- `src/globals/Home/config.ts`: `maxRows` 3 → `HERO_SHOWCASE_MAX = 8` (konstanta bernama, dipakai juga di `page.tsx`). Hanya validasi; asumsi tidak ada migrasi DB — wajib dicek di tahap plan (`pnpm payload migrate:create` dry check). Deskripsi field diperbarui ("Up to 8 apps…").
- `src/app/(frontend)/[locale]/page.tsx`: fallback `getShowcaseApps(locale, HERO_SHOWCASE_MAX)`. Daftar showcase di-dedup berdasarkan `id` (admin bisa memilih app yang sama dua kali → key React ganda).
- `getShowcaseApps` (`src/utilities/apps/queries.ts`): tambah `shortDescription` dan `slug` pada `select`. Cache key tidak berubah bentuk (limit sudah argumen).
- `ShowcaseApp` (`HomeHero.tsx`): `Pick<App, 'id' | 'name' | 'slug' | 'shortDescription' | 'screenshots'>`. Harus dicek di plan bahwa app pilihan editor dari `getHome` terisi `shortDescription` (depth ≥ 1); kalau tidak, naikkan depth seperlunya.

### Susunan slot

- Ring dengan indeks aktif `i` dan `n` app: tengah = `a[i]`, kanan = `a[i+1]`, kiri = `a[i-1]` (modulo n).
- **Pilihan saya:** hari ini kiri = app ke-2 dan kanan = app ke-3; dengan ring natural posisinya tertukar (kiri = app terakhir, kanan = app ke-2). Alasan: "next" harus terasa dari kanan ke kiri secara konsisten. Tengah tetap app pertama (sama dengan sekarang).
- `n = 1`: statis, tanpa tombol dan tanpa timer. `n = 2`: dua HP (kiri + tengah, seperti sekarang), tombol aktif. `n = 0`: tidak ada hero HP (perilaku sekarang).

### Layar yang bergeser

- Tiap `PhoneFrame` punya jendela 3 layer di dalam layar: `[sebelumnya, sekarang, berikutnya]` pada satu track yang digeser `translateX` ±100% (transform saja, `will-change: transform` hanya saat transisi). Setelah `transitionend`, jendela direset ke indeks baru tanpa transisi. Jumlah gambar berbeda yang dimuat konstan (maks 5), tidak naik dengan `n`.
- Render awal SSR = persis hari ini (hanya layer "sekarang", prioritas gambar sama: tengah `priority`, sisi `eager`+`fetchPriority=low`). Layer tetangga baru dipasang setelah hidrasi pada saat idle (`requestIdleCallback`/fallback `setTimeout`) dengan `loading="lazy"`/low priority, agar tidak bersaing dengan LCP.
- Tombol ditekan saat transisi berjalan: input diantrikan/diabaikan (kunci `isAnimating`); tidak ada tumpukan atau lompat. Gambar tetangga belum siap → tunda geser sampai `decode`/load selesai, atau (pilihan saya) tetap geser tetapi latar layer memakai `bg-surface-2` sehingga tidak ada kedip kosong.
- Durasi 500 ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`; ketiga HP bergeser serentak dengan selisih 60 ms (stagger kecil) agar terasa hidup.

### HP bisa diklik ke halaman detail (tambahan pemilik)

- Setiap HP (kiri, tengah, kanan) dibungkus satu `<a>` (`next/link`) ke halaman detail app yang sedang tampil di HP itu: `localizeHref('/apps/<slug>', locale)`, jadi `/apps/<slug>` untuk EN dan `/id/apps/<slug>` untuk ID. Halaman penuh langsung, tanpa `data-quick-view` (popup default mati, sesuai CLAUDE.md).
- Hover: `cursor-pointer` pada area HP. Tanpa efek visual tambahan (tidak diminta). `n = 1` juga tertaut.
- Anchor berada **di dalam** node `data-story-part="phone-*"` dan membungkus `PhoneFrame`, jadi `transform` GSAP tidak tersentuh. Anchor `display: block`, mengikuti sudut membulat bingkai.
- Aksesibilitas: HP tetap dekorasi (`aria-hidden`), maka anchor-nya `aria-hidden="true"` + `tabIndex={-1}` agar tidak muncul tautan fokus tanpa nama. Akses keyboard/pembaca layar ke app tengah lewat tautan nama di kotak deskripsi. Sentuhan/mouse memakai anchor HP. **Konsekuensi yang disengaja:** HP sisi hanya bisa dibuka dengan mouse/sentuh; pengguna keyboard mencapainya setelah app itu ada di tengah.
- Swipe vs klik: geseran di atas ambang 40 px tidak boleh memicu navigasi (klik yang mengikuti swipe di-`preventDefault`); gambar `draggable={false}` agar tidak terseret.
- Saat transisi berjalan, tujuan tautan sebuah HP mengikuti app pada layer yang sedang dominan (berganti di awal transisi); tidak ada tautan yang menunjuk app yang tidak terlihat.
- Hover di HP ikut menjeda autoplay (sudah tercakup aturan hover pada stage).

### Kotak deskripsi + kontrol (di dalam kolom stage)

- Posisi: bawah tengah stage, di area kotak merah. Baris: tombol kiri (`ChevronLeft`), blok teks (nama app sebagai tautan ke `/apps/<slug>` lewat `localizeHref` + `shortDescription`, `line-clamp-3`, tinggi minimum tetap agar tanpa CLS), tombol kanan, dan tombol jeda/putar kecil (**pilihan saya**, syarat WCAG 2.2.2; boleh dibuang oleh pemilik).
- Pergantian teks: fade 250 ms sinkron dengan geser layar. `shortDescription` kosong → sembunyikan paragraf, nama tetap tampil.
- Elemen interaktif **di luar** wrapper `aria-hidden` yang membungkus HP dekoratif. Wrapper kontrol: `role="group"`, `aria-roledescription="carousel"`, label dari kamus. `aria-live="off"` saat autoplay, `polite` setelah interaksi manual. Label tombol baru masuk `src/i18n/dictionaries/{en,id}.ts` (prev, next, pause, play, label carousel).
- Tombol ≥ 44×44 px area sentuh, fokus terlihat, bisa lewat keyboard.
- Swipe horizontal di mobile via Pointer Events (`touch-action: pan-y`, ambang 40 px); tidak memblokir scroll vertikal.

### Autoplay

- Jeda **5 detik** (konstanta bernama). Berhenti saat: kursor di atas stage (hanya `hover: hover`), fokus di dalam grup, tab tersembunyi (`visibilitychange`), hero keluar layar (`IntersectionObserver`), atau tombol jeda aktif. Setelah klik manual, timer di-reset (tidak berhenti permanen).
- `prefers-reduced-motion: reduce` (dibaca juga lewat `matchMedia` + listener `change`): tanpa autoplay, perpindahan manual instan.
- Timer dibersihkan saat unmount; `layoutKey` di `page.tsx` sudah berubah saat daftar showcase berubah, sehingga state indeks ikut reset (key komponen = gabungan id).

### Struktur kode

- Fungsi murni (indeks ring, jendela layer, normalisasi modulo, dedup) di berkas terpisah tanpa React, agar bisa diuji Vitest.
- Satu komponen client baru untuk stage (`'use client'` hanya di sana); `HomeHero.tsx` tetap server component dan mempertahankan wrapper pose (`STAGE`) + `data-story-part="phone-*"` yang dianimasikan GSAP. Layar yang bergeser berada **di dalam** node itu, tidak menyentuh `transform` miliknya.
- Tailwind v4 + token yang ada; tanpa warna hex atau inline style (nilai dinamis lewat `data-*`/class).

## Risiko dan hal yang harus diverifikasi saat build

1. Tinggi: kotak deskripsi harus muat di tinggi hero sekarang (stage 748 px di `lg`; HP sisi berakhir ±688 px). Cek 1366×768, 1440×900, 1920×1080. Jika perlu tambahan tinggi, naikkan seminimal mungkin dan cek lagi sticky hero + `story-spacer` serta CLS.
2. `shortDescription` ikut terbaca untuk app pilihan editor (depth).
3. Tidak ada migrasi untuk `maxRows`.
4. Lighthouse mobile: Performance ≥ 90, A11y/SEO ≥ 95, LCP tidak memburuk dibanding baseline sebelum perubahan (ukur dulu).

## Pengujian

- Vitest (`tests/int`): fungsi ring/jendela untuk n = 0, 1, 2, 3, 8; modulo negatif; dedup; validasi `maxRows` 8 diterima dan 9 ditolak.
- Playwright (`tests/e2e`): render awal = app pertama di tengah + deskripsinya (SSR, tanpa JS); klik next/prev mengubah deskripsi dan layar; wrap-around di ujung; autoplay maju dengan `page.clock`; berhenti saat hover/fokus/jeda/tab tersembunyi; reduced-motion tanpa autoplay; `n=1` tanpa kontrol; klik tiap HP (kiri/tengah/kanan) menuju `/apps/<slug>` yang benar, juga `/id/apps/<slug>` di locale ID, dan setelah beberapa kali geser; `cursor` terhitung `pointer`; swipe tidak memicu navigasi; anchor HP `aria-hidden` + `tabindex=-1`; satu `<h1>`; tombol punya nama aksesibel; kedua locale (en/id); tes scroll story hero yang ada tetap lulus tanpa diubah.
- Verifikasi manual di browser: transisi mulus, klik cepat berulang, swipe di emulasi mobile, 0 error konsol, dan `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`.

## Dokumentasi

Tambah satu butir di CLAUDE.md "Hal yang sering keliru" (carousel hero: konstanta batas, aturan interaktif di luar `aria-hidden`, jangan menyentuh `transform` node `phone-*`).

## Pilihan saya (mohon dikoreksi bila tidak cocok)

Batas 8 app · jeda 5 detik · ring natural (sisi app 2/3 tertukar dibanding sekarang) · tombol jeda/putar · swipe mobile · durasi 500 ms dengan stagger 60 ms · nama app jadi tautan ke halaman app · dedup showcase · anchor HP tidak masuk urutan Tab (alasan aksesibilitas di atas).

## Diserahkan ke builder

Nilai CSS persisnya (offset, ukuran font/spasi kotak deskripsi), penamaan berkas/komponen, urutan implementasi, dan keputusan teknis kecil yang tidak mengubah perilaku di atas.
