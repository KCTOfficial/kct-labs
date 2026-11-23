# Dokumen Legal per App — Design

Tanggal: 2026-11-23 · Status: **draft untuk disetujui** (belum ada kode)
Desain visual: `design/kct-hub.pen` (frame `Admin A`–`E`, `ADD-*`, `EDIT-*`, `DEL-*`, `PUB-1`, `VER-1`, `TYPE-*`, `APP-DEL`, `Legal Doc A/Mobile`, `NAV-0…8`, `Design Notes — Legal Documents`).

## 1. Maksud & alasan

Setiap app yang terbit di Google Play wajib punya URL publik untuk dokumen seperti Privacy Policy, Terms, dan Account Deletion. Sekarang dokumen ini berupa file `.md` di repo terpisah (`kctofficial.github.io/legals`), dan di CMS hanya ada satu field `privacyPolicyUrl`. Tujuannya: admin bisa **menambah, mengubah, menghapus dokumen legal per app dari Admin KCT Hub**, dengan menulis Markdown atau mengunggah `.md`. Jumlah dan jenis dokumen tidak dibatasi, jadi dokumen jenis baru tidak butuh perubahan kode. Setiap dokumen punya URL publik yang stabil di domain KCT Hub.

## 2. Goals / non-goals / anti-goals

**Goals**
- CRUD dokumen legal per app dari tab "Legal" di form App (drawer Payload), plus daftar global untuk audit.
- Input: editor Markdown (field `code`) dan upload `.md` (dibaca di browser, mengisi editor).
- Jenis dokumen bisa diperluas lewat collection `document-types`.
- Konten EN wajib, ID opsional dengan fallback ke EN.
- Halaman publik cepat, SEO lengkap, URL stabil, redirect 301 saat slug berubah.

**Non-goals**
- Migrasi atau impor 15 dokumen di `github.io/legals`. Dokumen lama dibiarkan apa adanya (keputusan user).
- Dokumen tingkat perusahaan (non-app) dan halaman hub `/legal` (ditolak).
- Editor WYSIWYG, kolaborasi real-time, tanda tangan/consent tracking.

**Anti-goals** (fitur dianggap gagal bila…)
- URL yang terdaftar di Play Console berubah atau 404 tanpa disadari admin.
- Halaman publik kosong/200 untuk dokumen yang tidak ada.
- Markdown bisa menyisipkan HTML/script ke halaman (XSS).
- Mengubah perilaku atau hasil fitur yang ada (Apps, quick-view, detail app) selain tambahan yang disebut di sini.

## 3. Constraints

- Stack yang ada: Payload 3.93 (`@payloadcms/db-postgres`, `richtext-lexical` 3.93), Next 16 App Router, Tailwind v4, pnpm. **Tanpa dependensi baru** (sudah dicek: `convertMarkdownToLexical`, `convertLexicalToMarkdown`, `EXPERIMENTAL_TableFeature` tersedia di `@payloadcms/richtext-lexical`).
- Aturan proyek (`CLAUDE.md`): skema baru perlu file migrasi untuk staging/produksi, sementara proyek belum punya baseline migrasi. Baseline migrasi sudah ada (`src/migrations/20261109_113225_initial.ts`; catatan "belum ada baseline" di `CLAUDE.md` sudah usang). Field localized + `requiredInDefaultLocale`. Akses `authenticatedOrPublished`. Link internal lewat `localizeHref`. Satu `<h1>`. JSON-LD di-escape. Tidak ada `loading.tsx` di atas route yang butuh 404.
- Backward compatibility: `apps.privacyPolicyUrl` tetap ada dan tetap dipakai sebagai fallback.
- Performa: query per halaman terbatas (tanpa N+1), cache ber-tag + `revalidateTag`, `select`/`depth` minimal.

## 4. Approaches yang dipertimbangkan

| # | Pendekatan | Trade-off | Hasil |
|---|---|---|---|
| 1 | **Collection terpisah `app-documents`** (+ `document-types`), join field di Apps | Draft/versi/publish per dokumen. Query satu dokumen ringan. Tidak membebani versi App. Butuh 2 tabel baru + migrasi. | **Dipilih** |
| 2 | Array `legalDocuments` di dalam Apps | Sederhana, tetapi setiap edit membuat versi App (maks 30), autosave mengirim semua markdown, dokumen tidak bisa terbit terpisah, halaman memuat semua dokumen. | Ditolak |
| 3 | File `.md` di Media, di-parse saat render | Butuh library markdown baru, parsing per request, tanpa localization/draft. | Ditolak |

Model bahasa: **satu dokumen = satu URL, konten EN/ID via Payload localization** (dipilih; alternatif "dokumen terpisah per bahasa" ditolak karena hreflang manual dan duplikasi). Frontend: **Variant A (docs layout)**. Admin: **A (join field di App)**, dengan D (list global) sebagai view bawaan collection untuk audit.

## 5. Model data

### 5.1 Collection `document-types` (grup admin "Apps")
| Field | Tipe | Catatan |
|---|---|---|
| `title` | text, **localized**, `requiredInDefaultLocale` | "Privacy Policy" / "Kebijakan Privasi" |
| `slug` | slugField, unique, **read-only setelah dibuat** | default slug dokumen. Kode mengenali jenis Privacy Policy lewat slug tetap `privacy-policy` (fallback `privacyPolicyUrl`). Karena slug tidak bisa diubah, fallback tidak bisa rusak diam-diam |
| `icon` | select (allowlist nama ikon lucide) | ikon di situs |
| `sortOrder` | number, index | urutan tampil |
| `requiredForPlay` | checkbox | menampilkan peringatan di tab Legal bila app belum punya jenis ini |

Akses: read publik (data non-rahasia), create/update/delete `authenticated`. **beforeDelete**: tolak bila masih direferensikan dokumen (frame TYPE-2). Seed awal (idempoten, lewat `pnpm seed:kct` — menjalankan seed tetap perlu persetujuan): Privacy Policy, Terms of Service, Terms & Conditions, Account Deletion.

### 5.2 Collection `app-documents` (grup "Apps", label "App Documents")
| Field | Tipe | Catatan |
|---|---|---|
| `app` | relationship → `apps`, required, index | terkunci saat dibuat dari join field |
| `documentType` | relationship → `document-types`, required, index | |
| `slug` | text, required, index | kebab-case, ≤ 80. Default dari `documentType.slug`. **Unik per app** (validasi + indeks unik gabungan `app`+`slug`) |
| `title` | text, localized, `requiredInDefaultLocale`, ≤ 120 | |
| `markdown` | code (`admin.language: 'markdown'`), localized, `requiredInDefaultLocale` | sumber kebenaran; batas **512 KB** per locale (validasi panjang byte) |
| `content` | richText (Lexical), localized, `admin.hidden`/readOnly | dibangkitkan dari `markdown` di `beforeChange` |
| `effectiveDate` | date | ditampilkan "Last updated". **Otomatis diisi tanggal publish setiap kali `markdown` (locale mana pun) berubah saat publish**, kecuali admin mengubahnya manual di perubahan yang sama. JSON-LD: `dateModified` = `effectiveDate` |
| SEO `meta` | plugin SEO (title/description) | opsional; fallback otomatis |

- **Satu dokumen per jenis per app:** indeks unik gabungan `app`+`documentType` di server (selain `app`+`slug`). UI ADD-1 hanya mencerminkan aturan ini.
- **"Konten ID terisi"** = `markdown` locale `id` tidak kosong (dicek per locale dengan `fallback: false`). Title ID boleh kosong dan memakai title EN. Bila `markdown` ID kosong, halaman `/id` dirender sebagai EN (banner, canonical ke EN, tanpa hreflang `id`, tidak masuk sitemap ID), walau title ID terisi. Dengan begitu tidak ada halaman campuran bahasa.
- `versions: { drafts: { autosave, schedulePublish }, maxPerDoc: 30 }`, sama dengan Apps.
- Akses: `authenticatedOrPublished` untuk read, `authenticated` untuk tulis.
- `useAsTitle: 'title'`, `defaultColumns: ['title','app','documentType','_status','updatedAt']`.
- `defaultPopulate`: `title`, `slug`, `documentType`, `effectiveDate` (ringan untuk join/quick-view).

### 5.3 Apps (tambahan, tanpa kolom baru)
- Tab baru **"Legal"** berisi **join field** `legalDocuments` (`collection: 'app-documents'`, `on: 'app'`, `defaultSort` mengikuti `documentType.sortOrder`, kolom: title, documentType, slug/URL, locale, status, updatedAt).
- `privacyPolicyUrl` tetap ada dengan deskripsi "Legacy — used only if no published Privacy Policy document".
- **Hapus App → cascade (keputusan user):** `beforeDelete` di Apps menghapus semua `app-documents` milik app itu (semua locale & versi) dengan meneruskan `req` agar tetap dalam satu transaksi. Modal konfirmasi menyebut jumlah dokumen & URL yang akan 404 (frame APP-DEL). Redirect yang menunjuk ke dokumen itu ikut dibersihkan.

### 5.4 Konversi Markdown → Lexical
- `beforeChange` di `app-documents`: untuk setiap locale yang `markdown`-nya berubah → `convertMarkdownToLexical({ editorConfig, markdown })` → simpan ke `content`. Editor config berisi heading, list, link, bold/italic, code, quote, **tabel** (`EXPERIMENTAL_TableFeature`).
- Heading `#` (H1) di markdown **di-demote menjadi H2** saat render, karena judul halaman sudah menjadi satu-satunya `<h1>`.
- HTML mentah di markdown tidak dieksekusi (Lexical memperlakukannya sebagai teks). Render hanya lewat komponen `RichText` yang ada.
- Konversi gagal → validasi error yang jelas di field, data tidak disimpan setengah.

## 6. Admin UX (rujuk frame)

- **Tab Legal (Admin A):** tabel join, tombol "Upload .md" & "Add new", count di tab, URL publik + salin, status, locale terisi (EN/ID). Empty state + info URL legacy (DEL-4).
- **Tambah (ADD-1…3):** drawer dengan App terkunci, dropdown jenis (jenis yang sudah dipakai app dinonaktifkan, opsi "Create new Document Type"), title/slug otomatis, Save Draft/Publish, toast + "Copy URL".
- **Upload .md (ADD-2, Admin C):** baca file di client (`FileReader`), tanpa unggah ke server. Validasi: ekstensi `.md/.markdown`, ≤ 512 KB, UTF-8 valid, tidak kosong. Mengisi editor locale aktif. `# heading` pertama ditawarkan sebagai title. Konten lama tetap ada di Versions. Validasi yang sama diulang di server.
- **Edit (EDIT-1…4):** drawer edit (Markdown | pratinjau split), switch locale ID dengan banner fallback + "Copy from English", error validasi, modal konfirmasi saat slug dokumen terbit diubah.
- **Download .md:** mengekspor `markdown` locale aktif.
- **Hapus / unpublish / versi (DEL-1…3, PUB-1, VER-1):** menu ⋮ (Unpublish, Duplicate, View versions, Delete). Modal hapus wajib mengetik slug + peringatan Play Console. Restore versi bawaan Payload.
- **Document Types (Admin E, TYPE-1/2).**
- **List global (Admin D):** list view bawaan collection dengan filter app/type/status untuk audit.

Komponen admin kustom (didaftarkan via importMap): field Markdown (toolbar upload/download/mode + pratinjau), cell "Public URL" dengan tombol salin, banner fallback locale, modal konfirmasi ganti slug & hapus berpengaman.

## 7. Frontend & URL

| Route | Isi | Status |
|---|---|---|
| `/apps/{app}/legal/{doc}` (EN), `/id/apps/{app}/legal/{doc}` | Halaman dokumen — Variant A: crumb `Home › All Apps › {App} › Legal › {Doc}`, chip app, H1, "Last updated", nav kiri (dokumen lain app ini), artikel, TOC kanan sticky (dari H2), link bahasa lain bila ada | baru |
| `/apps/{app}/legal`, `/id/apps/{app}/legal` | Index dokumen terbit milik app (urut type) | **baru, disetujui** |
| `/apps/{app}` | Panel "App information" mendapat grup **LEGAL** + "All legal documents". Bila belum ada dokumen Privacy Policy → link `privacyPolicyUrl` (eksternal) seperti sekarang | perubahan kecil |
| Quick-view `/next/quick-view` + dialog | Baris **LEGAL** (title, slug, ikon type) di atas tombol; disembunyikan bila kosong | perubahan kecil |

Jalur akses: NAV-0 (Home → quick-view/detail → dokumen; detail → index → dokumen; langsung dari Google Play/pencarian; mobile).

**Status & edge case**
- App tidak ada/tidak publik → 404. Dokumen tidak ada/unpublished → `notFound()` (404 asli). Index tanpa dokumen → 404. Tidak ada `loading.tsx` di atas route ini.
- App **archived**: halaman dokumen & index tetap bisa diakses (Google Play masih menautkan), `noindex`, tidak masuk sitemap.
- `/id/...` tanpa konten ID: render EN dengan banner, `lang="en"` di artikel, canonical ke URL EN, tanpa hreflang `id` untuk dokumen itu.
- Draft preview: pakai mekanisme preview yang ada, `noindex`.
- Tabel lebar scroll di dalam kotaknya. Tanpa H2 → TOC disembunyikan. Link eksternal `target="_blank" rel="noopener noreferrer"`. Link antar dokumen relatif tetap berfungsi.

## 8. SEO

- `generateMetadata` via `generateMeta`. Title `{Doc} – {App} | KCT Hub` (dipotong ≤ 60). Description: `meta.description` → paragraf pertama (120–160) → default. Canonical absolut. OG/Twitter (gambar: ikon/OG app). `og:locale`.
- hreflang `en`, `id` (hanya bila ID terisi), `x-default`.
- JSON-LD: `BreadcrumbList` + `WebPage` (index: `ItemList`). Tanpa data karangan.
- Sitemap: dokumen published (app tidak archived), kedua locale, `lastmod = updatedAt`. Ditambahkan ke sitemap apps yang ada atau route sitemap baru yang didaftarkan di `next-sitemap.config.cjs` (keputusan builder).
- Slug dokumen berubah setelah terbit → buat redirect 301 (`redirectsPlugin`, `to.type: 'custom'` dengan path baru untuk kedua locale) agar skema `redirects` tidak berubah. **Slug App berubah** (keputusan user: *lock + warn*): bila app punya ≥ 1 dokumen terbit, field `slug` App tampil terkunci dengan tombol "Unlock". Unlock membuka modal yang mendaftar semua URL dokumen (EN+ID) yang akan 404, dan admin wajib mencentang "Saya akan memperbarui Play Console". Server ikut memvalidasi: `beforeChange` Apps menolak perubahan slug tanpa flag konfirmasi (`context`/field non-persisten) bila ada dokumen terbit, jadi Local API/REST tidak bisa melewatinya diam-diam. **Tidak ada redirect otomatis**, sesuai perilaku Apps sekarang (frame APP-SLUG).

## 9. Data access, cache & performa

- Query ber-cache (`unstable_cache`) dengan tag baru `app-documents` (+ tag app). `revalidateTag` di `afterChange`/`afterDelete` `app-documents` & `document-types`, dan di hook Apps yang ada.
- Halaman dokumen: 1 query app (`getAppBySlug`, sudah ber-cache) + 1 query daftar dokumen app (`select` ringan: title, slug, type) + 1 query dokumen (`depth: 1`). Index/quick-view/detail memakai daftar ringan yang sama.
- Indeks: `app`, `documentType`, `slug`, `_status`, unik gabungan `app+slug`.
- `generateStaticParams` untuk dokumen published (pola `getPublicAppSlugs`), revalidate on-demand.

## 10. Keamanan

- Akses fail-closed (publik hanya `_status: published` dan app tidak dihapus).
- Validasi server: slug regex kebab-case, panjang, ukuran markdown, UTF-8. Upload client hanya kenyamanan, server tetap memvalidasi.
- Render tanpa `dangerouslySetInnerHTML` (kecuali JSON-LD yang di-escape). Tidak ada eksekusi HTML dari markdown.
- `overrideAccess: false` saat Local API dipanggil dengan `user`. Teruskan `req` di hook (cascade, redirect).

## 11. Migrasi & rollout

- Skema baru: `document_types`, `app_documents` (+ `_locales`, `_v`, `_rels`), field join (tanpa kolom di `apps`). Dev memakai push. Staging/produksi: satu migrasi baru di atas baseline `20261109_113225_initial` lewat `pnpm payload migrate:create` (membuat/menjalankan migrasi wajib konfirmasi).
- `pnpm generate:types` & `pnpm generate:importmap`.
- Rollout bertahap: deploy → isi dokumen → ganti URL di Play Console per app.

## 12. Pengujian

- **Int (Vitest):** validasi (slug, ukuran, UTF-8, unik per app), konversi markdown→Lexical (heading, list, tabel, link, HTML mentah tidak dieksekusi, H1 di-demote), fallback locale, cascade delete app, blokir delete type, pembuatan redirect saat slug berubah, akses (draft tidak terbaca publik).
- **E2E (Playwright):** halaman dokumen (title, description, canonical, hreflang, JSON-LD, satu `<h1>`, crumb), index, 404 (doc/app tidak ada, unpublished), `/id` fallback, grup LEGAL di detail, baris LEGAL di quick-view (dan tetap satu `<h1>` di luar dialog), fallback `privacyPolicyUrl`, alur admin tambah/upload/hapus.
- Checklist SEO `CLAUDE.md` + `pnpm build`, lint, tsc.

## 13. Diputuskan oleh user

- Model bahasa: satu URL, EN/ID via localization.
- Dokumen per app saja. Dokumen github.io lama dibiarkan.
- Collection terpisah. Admin A. Frontend Variant A.
- URL index `/apps/{app}/legal` disetujui. Hub `/legal` + link footer ditolak.
- Hapus App → dokumen ikut terhapus (cascade).
- Slug App dengan dokumen terbit → dikunci + modal peringatan, tanpa redirect otomatis.

## 14. Diserahkan ke builder (keputusan saya, bisa dikoreksi)

- Batas 512 KB per locale; slug ≤ 80; title ≤ 120.
- Redirect 301 memakai `to.type: 'custom'` (tanpa ubah skema redirects).
- Sitemap: gabung ke sitemap apps atau route baru.
- Bentuk persis komponen admin kustom, selama sesuai frame.
- Satu dokumen per jenis per app (unik `app`+`documentType`). Slug Document Type tidak bisa diubah. Privacy Policy dikenali lewat slug `privacy-policy`.
- "Last updated" otomatis diperbarui saat konten dipublish ulang.
- "Konten ID terisi" = markdown ID tidak kosong.

## 15. Pertanyaan terbuka

Tidak ada. Slug App yang punya dokumen terbit → dikunci + peringatan, tanpa redirect otomatis (diputuskan user).
