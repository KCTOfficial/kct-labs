# Dokumen Legal per App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin bisa mengelola dokumen legal (Privacy Policy, Terms, Account Deletion, …) per app dari Payload. Setiap dokumen terbit di `/apps/{app}/legal/{doc}` (EN) dan `/id/apps/{app}/legal/{doc}` (ID), lengkap dengan SEO.

**Architecture:** Dua collection baru (`document-types`, `app-documents`). Markdown (field `code`, localized) adalah sumber kebenaran dan dikonversi ke Lexical di `beforeChange`, lalu dirender lewat `RichText` yang sudah ada. Apps mendapat tab "Legal" (join field), cascade delete, dan kunci slug. Frontend membaca lewat query `unstable_cache` bertag `app-documents` yang di-revalidate oleh hook.

**Tech Stack:** Payload 3.93 (`db-postgres`, `richtext-lexical` 3.93), Next 16 App Router, React 19, Tailwind v4, Vitest (int, DB lokal), Playwright (e2e). Tanpa dependensi baru.

**Spec:** `docs/superpowers/specs/2026-11-23-legal-documents-design.md` · Desain: `design/kct-hub.pen` (frame `Admin A–E`, `ADD-*`, `EDIT-*`, `DEL-*`, `PUB-1`, `VER-1`, `TYPE-*`, `APP-DEL`, `APP-SLUG`, `Legal Doc A`, `Legal Doc — Mobile`, `NAV-*`). Buka `.pen` hanya lewat Pencil MCP.

## Global Constraints

- Ikuti `CLAUDE.md`. **Commit, migrasi, seed, dan perubahan dependensi wajib persetujuan user.** Setiap langkah "Commit" di bawah berarti: siapkan pesan, lalu minta izin.
- Pesan commit `tipe: deskripsi`, tanpa atribusi AI.
- Batas: slug dokumen ≤ 80 (`SLUG_MAX_LENGTH` dari `src/utilities/apps/appPath.ts`, pola kebab-case yang sama). Title ≤ 120. Markdown ≤ **512 KB (524 288 byte UTF-8) per locale**.
- Locale: `en` wajib (`requiredInDefaultLocale(defaultLocale)`), `id` opsional dengan fallback EN.
- "Konten ID ada" = `markdown` locale `id` tidak kosong (dicek dengan `fallbackLocale: false`).
- URL: EN `/apps/{app}/legal/{doc}`, ID `/id/apps/{app}/legal/{doc}`. Index `/apps/{app}/legal`. **Tidak ada `/legal`.**
- Satu dokumen per `documentType` per app. Slug unik per app.
- Slug `document-types` read-only setelah dibuat. Privacy Policy dikenali lewat slug `privacy-policy`.
- Hapus App → semua dokumennya terhapus dalam transaksi yang sama (teruskan `req`).
- Slug App dengan ≥ 1 dokumen terbit dikunci. Mengubahnya wajib konfirmasi, tanpa redirect otomatis.
- Slug dokumen terbit berubah → buat redirect 301 `to.type: 'custom'` untuk EN dan ID. Skema `redirects` tidak berubah.
- Nama situs dari `SITE_NAME`. Link internal lewat `localizeHref`. Satu `<h1>`. JSON-LD lewat `serializeJsonLd`/`JsonLd`. Tidak ada `loading.tsx` di atas route legal. Tanpa `dangerouslySetInnerHTML` untuk konten.
- Local API dengan `user` → `overrideAccess: false`. Query publik → `draft: false, overrideAccess: false`.

## Review Focus

1. **App archived, dokumen dibuka dari Google Play** → halaman 200, `noindex`, tidak masuk sitemap (Task 7, Task 10).
2. **`/id/...` untuk dokumen yang hanya punya title ID tanpa markdown ID** → dirender EN dengan banner, canonical ke EN, tanpa hreflang `id` (Task 6, Task 7).
3. **Markdown berisi `<script>`/HTML mentah atau `# H1` ganda** → tampil sebagai teks/H2, tetap satu `<h1>` (Task 2, Task 7 e2e).
4. **Upload `.md` non-UTF-8, kosong, > 512 KB, atau berekstensi lain** → ditolak di client dan server dengan pesan jelas (Task 1, Task 11).
5. **Ganti slug App lewat REST/Local API tanpa konfirmasi saat ada dokumen terbit** → ditolak server (Task 5).

---

### Task 1: Validator & util Markdown murni

**Files:**
- Create: `src/utilities/legal/validation.ts`
- Test: `tests/int/legal-validation.int.spec.ts`

**Interfaces:**
- Produces:
  - `MARKDOWN_MAX_BYTES = 524_288`
  - `MARKDOWN_EXTENSIONS = ['.md', '.markdown'] as const`
  - `isValidDocSlug(v: unknown): v is string` (re-export `isValidSlug`)
  - `markdownByteLength(s: string): number`
  - `validateMarkdown(s: string | null | undefined, { required }: { required: boolean }): true | string`: pesan EN untuk kosong, terlalu besar, atau mengandung `�`
  - `extractMarkdownTitle(s: string): string | null`: teks `# ` pertama, di-trim
  - `hasMarkdownContent(s: string | null | undefined): boolean`
  - `isAllowedMarkdownFile(name: string, size: number): true | string`

- [ ] **Step 1: Tulis tes gagal.** `validateMarkdown('', {required:true})` mengembalikan string. `validateMarkdown('', {required:false}) === true`. `'a'.repeat(524_289)` ditolak, `'a'.repeat(524_288)` diterima. `'x�y'` ditolak. `extractMarkdownTitle('intro\n# Privacy Policy \n## A') === 'Privacy Policy'`. `extractMarkdownTitle('## A') === null`. `isAllowedMarkdownFile('a.MD', 10) === true`. `isAllowedMarkdownFile('a.docx', 10)` dan `('a.md', 0)` mengembalikan string. `hasMarkdownContent('  \n') === false`.
- [ ] **Step 2:** `pnpm exec vitest run --config ./vitest.config.mts tests/int/legal-validation.int.spec.ts` → FAIL (modul tidak ada).
- [ ] **Step 3:** Implementasikan. Ukuran dihitung dengan `new TextEncoder().encode(s).length`. Modul murni dan aman dipakai di client.
- [ ] **Step 4:** Tes PASS.
- [ ] **Step 5: Commit** `feat: validator markdown dokumen legal`.

### Task 2: Konversi Markdown → Lexical + TOC

**Files:**
- Create: `src/utilities/legal/lexical.ts`
- Test: `tests/int/legal-lexical.int.spec.ts`

**Interfaces:**
- Consumes: `@payloadcms/richtext-lexical` (`convertMarkdownToLexical`, `editorConfigFactory`, `EXPERIMENTAL_TableFeature`, fitur default).
- Produces:
  - `legalEditor`: `lexicalEditor({ features: [...defaultFeatures, EXPERIMENTAL_TableFeature()] })` (dipakai field `content` di Task 4)
  - `markdownToLexical(markdown: string, config: SanitizedConfig): Promise<SerializedEditorState>`: memanggil `demoteH1`
  - `demoteH1(state): SerializedEditorState`: setiap `heading` dengan `tag: 'h1'` diubah menjadi `'h2'`, rekursif
  - `extractToc(state): Array<{ id: string; text: string }>`: heading `h2` saja, `id` = slug dari teks dan unik (`-2`, `-3` untuk duplikat)
  - `headingId(text: string): string` (dipakai renderer di Task 7)

- [ ] **Step 1: Tulis tes gagal** (pakai `getPayload` untuk config). Input `'# T\n\n## A\n\n- x\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n[l](https://e.x)\n\n<script>alert(1)</script>'`. Harapan:
  - tidak ada node `heading` dengan `tag: 'h1'`;
  - ada node `table`;
  - ada node `link` dengan url `https://e.x`;
  - tidak ada node bertipe `html`, dan string `<script>` hanya muncul sebagai text node.
  - `extractToc` pada `'## A\n## A\n### B'` → `[{id:'a',text:'A'},{id:'a-2',text:'A'}]`.
- [ ] **Step 2:** Jalankan → FAIL.
- [ ] **Step 3:** Implementasikan. Bila `convertMarkdownToLexical` tidak menghasilkan `table` dengan `EXPERIMENTAL_TableFeature`, **berhenti dan laporkan**: spec mengasumsikan dukungan tabel, jadi jangan menambah dependensi.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat: konversi markdown ke lexical untuk dokumen legal`.

### Task 3: Collection `document-types`

**Files:**
- Create: `src/collections/DocumentTypes/index.ts`, `src/collections/DocumentTypes/hooks/preventDeleteWhenUsed.ts`
- Create: `src/utilities/legal/constants.ts` (`PRIVACY_POLICY_TYPE_SLUG = 'privacy-policy'`, `LEGAL_ICONS = ['shield-check','scroll-text','file-check','user-x','lock','file-text'] as const`, `APP_DOCUMENTS_CACHE_TAG = 'app-documents'`)
- Modify: `src/payload.config.ts` (daftarkan setelah `AppCategories`)
- Test: `tests/int/document-types.int.spec.ts`

**Interfaces:**
- Produces: slug `document-types`. Field: `title` (localized, `requiredInDefaultLocale`, maxLength 80), `slug` (`slugField`, unique, `admin.readOnly` saat update + `beforeChange` menolak perubahan), `icon` (select `LEGAL_ICONS`, default `file-text`), `sortOrder` (number, index, default 0), `requiredForPlay` (checkbox). Akses: read publik, tulis `authenticated`. `admin.group: 'Apps'`, `useAsTitle: 'title'`, `defaultSort: 'sortOrder'`.

- [ ] **Step 1: Tulis tes gagal:**
  - membuat tipe berhasil;
  - update `slug` → error;
  - delete tipe tanpa dokumen → OK;
  - delete tipe yang dipakai → error berisi jumlah dokumen (tes ini diaktifkan setelah Task 4; tandai `it.todo` dulu);
  - user anonim bisa `find`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementasikan. `preventDeleteWhenUsed`: `beforeDelete` → `payload.count({ collection: 'app-documents', where: { documentType: { equals: id } }, req })` → `throw new APIError(..., 409)` bila > 0.
- [ ] **Step 4:** `pnpm generate:types` lalu tes PASS.
- [ ] **Step 5: Commit** `feat: collection document-types`.

### Task 4: Collection `app-documents`

**Files:**
- Create: `src/collections/AppDocuments/index.ts`
- Create: `src/collections/AppDocuments/hooks/{convertMarkdown.ts,stampEffectiveDate.ts,redirectOnSlugChange.ts,revalidateAppDocument.ts}`
- Create: `src/utilities/legal/paths.ts`: `legalDocPath(appSlug, docSlug)` → `/apps/${a}/legal/${d}`, `legalIndexPath(appSlug)` → `/apps/${a}/legal`
- Modify: `src/payload.config.ts`, `src/plugins/index.ts` (`seoPlugin.collections` + `generateTitle` untuk `app-documents`)
- Test: `tests/int/app-documents.int.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`validateMarkdown`, `isValidDocSlug`), Task 2 (`legalEditor`, `markdownToLexical`), Task 3 (constants).
- Produces: slug `app-documents`. `slug` memakai `hooks.beforeDuplicate` → `${value}-copy`, dan `app` memakai `beforeDuplicate` → `null`. Field sesuai spec §5.2:
  - `app` (relationship apps, required, index);
  - `documentType` (relationship, required, index, `filterOptions` mengecualikan tipe yang sudah dipakai app ini, kecuali milik dokumen yang sedang diedit);
  - `slug` (text, required, index, default dari `documentType.slug`);
  - `title` (localized, max 120);
  - `markdown` (`code`, `admin.language: 'markdown'`, localized, `validate` memakai `validateMarkdown` dengan `required` hanya untuk `defaultLocale`);
  - `content` (richText `legalEditor`, localized, `admin.hidden`);
  - `effectiveDate` (date);
  - tab SEO `meta`.
  - `indexes: [{ fields: ['app','slug'], unique: true }, { fields: ['app','documentType'], unique: true }]`.
  - `versions` sama dengan Apps.
  - `defaultPopulate: { title, slug, documentType, effectiveDate }`.
  - Akses `authenticatedOrPublished` / `authenticated`.

- [ ] **Step 1: Tulis tes gagal:**
  - create EN → `content` berisi heading;
  - dokumen kedua dengan `app`+`slug` sama → error;
  - dokumen kedua dengan `app`+`documentType` sama → error;
  - draft tidak terbaca anonim (`overrideAccess:false`);
  - publish dengan markdown berubah → `effectiveDate` = hari ini, sedangkan publish tanpa perubahan markdown → `effectiveDate` tetap;
  - ganti slug dokumen terbit → 2 record `redirects` (`from` EN dan `/id/...`, `to.type: 'custom'`);
  - markdown > 512 KB → error validasi;
  - `duplicate` dokumen → salinan berstatus draft dengan slug `{slug}-copy` (tanpa melanggar indeks unik). Karena `app`+`documentType` juga unik, `app` salinan dikosongkan dan wajib dipilih ulang (validasi required berlaku saat simpan);
  - aktifkan `it.todo` di Task 3.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementasikan hook:
  - `convertMarkdown` (`beforeChange`): bila `data.markdown` ada dan berbeda dari `originalDoc.markdown` untuk `req.locale`, set `data.content`. Untuk `req.locale === 'all'`, iterasi per locale.
  - `stampEffectiveDate` (`beforeChange`): saat `data._status === 'published'` dan markdown berubah, kecuali `data.effectiveDate` diubah manual.
  - `redirectOnSlugChange` (`afterChange`): saat `previousDoc._status === 'published'` dan slug berbeda, buat redirect dengan `req`.
  - `revalidateAppDocument`: `revalidateTag(APP_DOCUMENTS_CACHE_TAG)` + `APPS_SITEMAP_CACHE_TAG`, menghormati `context.disableRevalidate`.
- [ ] **Step 4:** `pnpm generate:types` lalu PASS.
- [ ] **Step 5: Commit** `feat: collection app-documents`.

### Task 5: Integrasi Apps (tab Legal, cascade, kunci slug)

**Files:**
- Modify: `src/collections/Apps/index.ts` (tab baru "Legal" setelah "Links"; deskripsi `privacyPolicyUrl` "Legacy — used only when this app has no published Privacy Policy document.")
- Create: `src/collections/Apps/hooks/{cascadeDeleteDocuments.ts,guardSlugChange.ts}`
- Modify: `src/collections/Apps/hooks/revalidateApp.ts` (ikut `revalidateTag(APP_DOCUMENTS_CACHE_TAG)`)
- Test: `tests/int/apps-legal.int.spec.ts`

**Interfaces:**
- Produces:
  - join field `legalDocuments` (`type: 'join'`, `collection: 'app-documents'`, `on: 'app'`, `admin.defaultColumns: ['title','documentType','slug','_status','updatedAt']`);
  - virtual checkbox `confirmSlugChange` (`virtual: true`, sidebar, hanya tampil bila slug terkunci; dipakai komponen Task 11);
  - `guardSlugChange` (`beforeChange`): bila `originalDoc.slug !== data.slug` dan ada ≥ 1 dokumen `_status: 'published'` untuk app ini, dan `data.confirmSlugChange !== true` → `ValidationError` pada field `slug`;
  - `cascadeDeleteDocuments` (`beforeDelete`): `payload.delete({ collection: 'app-documents', where: { app: { equals: id } }, req })`, lalu hapus `redirects` yang `to.url` diawali `legalIndexPath(slug)`.

- [ ] **Step 1: Tulis tes gagal:**
  - hapus app dengan 2 dokumen → 0 dokumen tersisa;
  - ganti slug app dengan dokumen terbit tanpa konfirmasi → error;
  - dengan `confirmSlugChange: true` → OK;
  - app tanpa dokumen terbit → ganti slug bebas;
  - `findByID` app dengan `joins` mengembalikan `legalDocuments.docs`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementasikan.
- [ ] **Step 4:** `pnpm generate:types` lalu PASS. Jalankan juga `tests/int/apps.int.spec.ts` (regresi).
- [ ] **Step 5: Commit** `feat: tab legal, cascade delete dan kunci slug di apps`.

### Task 6: Query ber-cache

**Files:**
- Create: `src/utilities/legal/queries.ts`
- Test: `tests/int/legal-queries.int.spec.ts`

**Interfaces:**
- Produces (semua `unstable_cache`, tag `[APP_DOCUMENTS_CACHE_TAG, APPS_CACHE_TAG]`):
  - `type LegalDocLink = { slug: string; title: string; icon: LegalIcon; typeSlug: string; effectiveDate: string | null; hasIndonesian: boolean }`
  - `getAppLegalDocs(appId: number, locale: Locale): Promise<LegalDocLink[]>`: published, urut `documentType.sortOrder`, `select` ringan, `depth: 1`. `hasIndonesian` didapat dari **satu** query tambahan (locale `id`, `fallbackLocale: false`, where `markdown exists` dan `not_equals ''`, select `slug`), digabung dengan `Set`.
  - `getAppLegalDoc(appId: number, slug: string, locale: Locale, draft: boolean): Promise<(AppDocument & { hasIndonesian: boolean }) | null>` (draft tanpa cache).
  - `getPublicLegalDocPaths(): Promise<Array<{ appSlug: string; docSlug: string; updatedAt: string; hasIndonesian: boolean; archived: boolean }>>` untuk `generateStaticParams` dan sitemap.
  - `resolvePrivacyLink(docs: LegalDocLink[], legacyUrl: string | null | undefined, appSlug: string, locale: Locale): { href: string; external: boolean } | null` (murni)

- [ ] **Step 1: Tulis tes gagal:**
  - dokumen draft tidak muncul;
  - urutan mengikuti `sortOrder`;
  - `hasIndonesian` false bila hanya title ID yang diisi;
  - `resolvePrivacyLink` memilih dokumen `privacy-policy` (internal), lalu fallback `legacyUrl` (external), lalu `null`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementasikan. Tanpa query di dalam loop.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat: query dokumen legal ber-cache`.

### Task 7: Halaman dokumen `/apps/[slug]/legal/[doc]`

**Files:**
- Create: `src/app/(frontend)/[locale]/apps/[slug]/legal/[doc]/page.tsx`
- Create: `src/components/legal/{LegalDocNav.tsx,LegalToc.tsx,LegalFallbackNotice.tsx,LegalArticle.tsx}`
- Modify: `src/i18n/dictionaries/{en,id}.ts` (namespace `legal`: `title`, `lastUpdated`, `onThisPage`, `otherDocs`, `backToApp`, `allDocuments`, `fallbackNotice`, `alsoIn`, `print`, `indexTitle`, `indexIntro`, `contactQuestion`)
- Modify: `src/utilities/seo/structuredData.ts` (`webPageSchema({ name, url, dateModified, inLanguage })`)
- Test: `tests/e2e/legal.e2e.spec.ts`

**Interfaces:**
- Consumes: Task 6 queries, Task 2 `extractToc`/`headingId`, Task 4 `legalDocPath`, `generateMeta`, `breadcrumbSchema`, `RichText`, `Breadcrumbs`, `PayloadRedirects`.
- Layout: frame `Legal Doc A` (desktop) dan `Legal Doc — Mobile`. Crumb `Home › All Apps › {App} › Legal › {Doc}`.

- [ ] **Step 1: Tulis e2e gagal.** Data dibuat lewat REST admin di `beforeAll`, lalu dibersihkan.
  - EN: `<title>` = `Privacy Policy – {App} | KCT Hub` (≤ 60), meta description 120–160, canonical absolut, hreflang `en`/`id`/`x-default` hanya bila ID ada, JSON-LD `BreadcrumbList` + `WebPage`, `h1` count = 1, TOC berisi H2.
  - `/id/...` tanpa markdown ID → banner terlihat, canonical = URL EN, tanpa `hreflang="id"`.
  - dokumen tidak ada → status 404.
  - app archived → status 200 + `meta[name=robots]` noindex.
  - markdown berisi `<script>` → tidak ada elemen `script` di dalam `article`.
- [ ] **Step 2:** `pnpm exec playwright test tests/e2e/legal.e2e.spec.ts` → FAIL.
- [ ] **Step 3:** Implementasikan:
  - `generateStaticParams` dari `getPublicLegalDocPaths`;
  - `notFound()` bila app/dokumen tidak ada, tetapi cek `PayloadRedirects` dulu untuk path lama;
  - `generateMetadata` via `generateMeta` (`translated: doc.hasIndonesian`, `noIndex: archived || draft`, fallback description = paragraf pertama dipotong `DESCRIPTION_MAX_LENGTH`);
  - artikel `lang="en"` bila locale `id` memakai fallback;
  - TOC disembunyikan bila tidak ada H2;
  - tabel dibungkus `overflow-x-auto`;
  - link eksternal `target="_blank" rel="noopener noreferrer"`.
- [ ] **Step 4:** PASS + `pnpm exec tsc --noEmit`.
- [ ] **Step 5: Commit** `feat: halaman dokumen legal`.

### Task 8: Index `/apps/[slug]/legal`

**Files:**
- Create: `src/app/(frontend)/[locale]/apps/[slug]/legal/page.tsx`
- Test: `tests/e2e/legal.e2e.spec.ts` (tambah `describe`)

- [ ] **Step 1: Tulis e2e gagal:**
  - daftar dokumen terbit tampil urut;
  - setiap item link ke `legalDocPath`;
  - JSON-LD `ItemList` + `BreadcrumbList`;
  - satu `h1`;
  - app tanpa dokumen → 404.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementasikan sesuai frame `NAV-4`, memakai `getAppLegalDocs` dan `itemListSchema`.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat: halaman index legal per app`.

### Task 9: Grup LEGAL di detail app + baris LEGAL di quick-view

**Files:**
- Modify: `src/app/(frontend)/[locale]/apps/[slug]/page.tsx` (blok `<ul>` di panel App information, sekitar baris 247–300)
- Modify: `src/utilities/apps/quickView.ts` (`QuickViewApp.legal: Array<{ title: string; href: string; icon: LegalIcon }>`, maks 4), `src/app/(frontend)/next/quick-view/route.ts`, `src/components/quick-view/QuickViewDialog.tsx`
- Test: `tests/int/quickView.int.spec.ts`, `tests/e2e/quick-view.e2e.spec.ts`, `tests/e2e/legal.e2e.spec.ts`

- [ ] **Step 1: Tulis tes gagal:**
  - `toQuickView(app, dict, legal)` meneruskan maksimal 4 link dengan `href` hasil `localizeHref`;
  - e2e detail: grup "Legal" berisi link internal + "All legal documents";
  - app tanpa dokumen tetapi punya `privacyPolicyUrl` → satu link eksternal (perilaku lama);
  - keduanya kosong → grup tidak dirender;
  - e2e quick-view: baris LEGAL tampil, dialog tetap tanpa `h1`/`article`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementasikan. `toQuickView` menerima argumen ketiga opsional (default `[]`) agar pemanggil lama tetap valid. Gunakan `resolvePrivacyLink`.
- [ ] **Step 4:** PASS, termasuk seluruh tes quick-view yang sudah ada.
- [ ] **Step 5: Commit** `feat: tautan dokumen legal di detail app dan quick-view`.

### Task 10: Sitemap

**Files:**
- Modify: `src/app/(frontend)/(sitemaps)/apps-sitemap.xml/route.ts`
- Modify: `src/utilities/seo/sitemap.ts` (`singleLocaleSitemapEntry(path, lastmod, options)`)
- Test: `tests/int/seo.int.spec.ts`

- [ ] **Step 1: Tulis tes gagal:**
  - dokumen dengan ID → 2 entri dengan alternates;
  - tanpa ID → 1 entri EN tanpa alternate `id`;
  - app archived → tidak ada entri;
  - index legal masuk bila app punya ≥ 1 dokumen.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementasikan dari `getPublicLegalDocPaths`. `lastmod` = `updatedAt`.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat: dokumen legal di sitemap`.

### Task 11: Komponen admin

**Files:**
- Create: `src/collections/AppDocuments/components/MarkdownField.tsx`: toolbar Write/Split/Preview, Upload .md (`FileReader`, validasi dengan `isAllowedMarkdownFile` + `validateMarkdown`, tawarkan `extractMarkdownTitle` ke `title` bila kosong), Download .md, pratinjau. Dipasang sebagai `admin.components.Field` pada `markdown`.
- Create: `src/collections/AppDocuments/components/PublicUrlField.tsx` (read-only + salin, sidebar), `LocaleFallbackBanner.tsx` (`beforeDocumentControls`, tampil bila locale `id` dan markdown kosong, tombol "Copy from English"), `DeleteImpactBanner.tsx` (peringatan Play Console di area dokumen yang sudah terbit)
- Create: `src/collections/Apps/components/MissingRequiredDocsBanner.tsx`: di atas join field tab Legal, menyebut Document Type `requiredForPlay` yang belum dimiliki app (contoh: "Privacy Policy belum ada — Google Play mewajibkannya")
- Create: `src/collections/Apps/components/SlugLockField.tsx`: membungkus slug; terkunci bila ada dokumen terbit; modal Unlock dengan daftar URL + checkbox, mengeset `confirmSlugChange`
- Modify: `src/collections/Apps/index.ts`, `src/collections/AppDocuments/index.ts` (path komponen)
- Run: `pnpm generate:importmap`
- Test: `tests/e2e/admin.e2e.spec.ts` (tambah `describe('legal documents')`)

- [ ] **Step 1: Tulis e2e admin gagal** (login dengan kredensial tes yang dipakai `admin.e2e.spec.ts`):
  - tab Legal → Add new → drawer dengan App terisi;
  - upload fixture `tests/e2e/fixtures/terms.en.md` → editor terisi dan title terdeteksi;
  - Publish → baris muncul;
  - upload `fixtures/bad.docx` → pesan error;
  - app tanpa Privacy Policy → banner `requiredForPlay` terlihat;
  - slug app terkunci, dan Unlock tanpa checkbox → tombol nonaktif;
  - hapus dokumen → baris hilang.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementasikan sesuai frame `ADD-*`, `EDIT-*`, `DEL-*`, `APP-SLUG`. Bila Payload 3.93 tidak menyediakan override modal konfirmasi hapus, **pertahankan modal bawaan** dan tampilkan dampaknya lewat `DeleteImpactBanner`. Jangan menggantikan alur hapus Payload.
- [ ] **Step 4:** PASS + `pnpm lint`.
- [ ] **Step 5: Commit** `feat: komponen admin dokumen legal`.

### Task 12: Migrasi, seed tipe, dokumentasi, verifikasi akhir

**Files:**
- Create: `src/migrations/<timestamp>_legal_documents.ts` (via `pnpm payload migrate:create legal_documents`, **minta persetujuan**)
- Modify: `scripts/seed-kct.ts` (upsert idempoten 4 tipe: privacy-policy, terms-of-service, terms-and-conditions, account-deletion; `requiredForPlay` true untuk privacy-policy)
- Modify: `design/README.md` (bagian "Dokumen legal"), `CLAUDE.md` (lokasi `src/collections/{DocumentTypes,AppDocuments}`, route legal, dan **koreksi catatan "belum ada baseline migrasi"** — tanyakan ke user dulu karena ini file instruksi proyek)

- [ ] **Step 1:** Minta persetujuan, lalu jalankan `pnpm payload migrate:create legal_documents`. Tinjau SQL: hanya tabel/indeks baru, tanpa `DROP` pada tabel lama.
- [ ] **Step 2:** Minta persetujuan, lalu jalankan `pnpm seed:kct`, kemudian `POST /api/apps/revalidate`.
- [ ] **Step 3:** Verifikasi penuh: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`. Semua harus lulus.
- [ ] **Step 4:** Checklist SEO `CLAUDE.md` di halaman dokumen & index (view-source, Rich Results Test untuk JSON-LD, Lighthouse mobile SEO/A11y ≥ 95, Performance ≥ 90).
- [ ] **Step 5: Commit** `chore: migrasi, seed dan dokumentasi dokumen legal`.
