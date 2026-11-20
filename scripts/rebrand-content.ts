/**
 * One-off content rebrand: "KCT Labs" → "KCT Hub" in content stored in the database
 * (Home/Header/Footer globals, apps, categories, pages, posts, media alt/caption, forms).
 * Code-level strings are already rebranded; this fixes data that the code cannot change.
 *
 * Usage:
 *   pnpm rebrand:content                        # DRY RUN (default): reports, writes nothing
 *   REBRAND_APPLY=true pnpm rebrand:content     # applies the changes
 * In production run it inside the migrator image (see docs/DEPLOYMENT.md, "Rebrand KCT Hub").
 *
 * Guarantees:
 * - Idempotent: a second run finds nothing to change.
 * - Per locale, read WITHOUT fallback, so English text is never copied into empty Indonesian fields.
 * - Only top-level fields that actually changed are sent; slugs/URLs/ids are never touched.
 * - Drafts-enabled collections: a document whose latest version is an unpublished draft is
 *   patched as a draft (never auto-published) and listed so an editor can review + publish it.
 * - Revalidation hooks are skipped (the script runs outside Next.js); afterwards call
 *   `POST /api/apps/revalidate` (admin) or restart the app container.
 * Exit codes: 0 = success (or nothing to do), 1 = at least one document failed.
 */
import config from '@payload-config'
import { getPayload, type CollectionSlug, type GlobalSlug, type TypedLocale } from 'payload'

import {
  changedTopLevelFields,
  LEGACY_BRAND,
  NEW_BRAND,
  replaceBrandDeep,
} from './rebrand/replaceBrand'

const APPLY = process.env.REBRAND_APPLY === 'true'
const PAGE_SIZE = 100
const COLLECTIONS: CollectionSlug[] = [
  'apps',
  'app-categories',
  'pages',
  'posts',
  'categories',
  'media',
  'forms',
]
const GLOBALS: GlobalSlug[] = ['home', 'header', 'footer']
const context = { disableRevalidate: true }

type Doc = Record<string, unknown>

const payload = await getPayload({ config })
const locales: Array<TypedLocale | undefined> = payload.config.localization
  ? (payload.config.localization.localeCodes as TypedLocale[])
  : [undefined]
let changedDocs = 0
let failures = 0
const needsPublish: string[] = []

const report = (target: string, locale: string | undefined, paths: string[]) =>
  payload.logger.info(
    `[rebrand] ${APPLY ? 'updated' : 'would update'} ${target} (${locale ?? 'default'}): ${paths.join(', ')}`,
  )

try {
  payload.logger.info(
    `[rebrand] "${LEGACY_BRAND}" → "${NEW_BRAND}" — ${APPLY ? 'APPLY' : 'DRY RUN (set REBRAND_APPLY=true to write)'}`,
  )

  for (const slug of GLOBALS) {
    for (const locale of locales) {
      const doc = (await payload.findGlobal({
        slug,
        depth: 0,
        locale,
        fallbackLocale: false,
        overrideAccess: true,
      })) as unknown as Doc
      const result = replaceBrandDeep(doc)
      if (!result.replacements) continue
      changedDocs += 1
      report(`global ${slug}`, locale, result.paths)
      if (!APPLY) continue
      try {
        await payload.updateGlobal({
          slug,
          data: changedTopLevelFields(doc, result.value) as never,
          depth: 0,
          locale,
          overrideAccess: true,
          context,
        })
      } catch (error) {
        failures += 1
        payload.logger.error({ err: error }, `[rebrand] failed: global ${slug} (${locale})`)
      }
    }
  }

  for (const slug of COLLECTIONS) {
    if (!payload.collections[slug]) continue
    const hasDrafts = Boolean(payload.collections[slug].config.versions?.drafts)
    for (const locale of locales) {
      for (let page = 1, hasNextPage = true; hasNextPage; page += 1) {
        // draft: true → the LATEST version (a pending draft if one exists), so it is never lost.
        const batch = await payload.find({
          collection: slug,
          depth: 0,
          draft: hasDrafts,
          fallbackLocale: false,
          limit: PAGE_SIZE,
          locale,
          overrideAccess: true,
          page,
          sort: 'id',
        })
        hasNextPage = batch.hasNextPage
        for (const doc of batch.docs as unknown as Doc[]) {
          const result = replaceBrandDeep(doc)
          if (!result.replacements) continue
          changedDocs += 1
          const isDraft = hasDrafts && doc._status === 'draft'
          const target = `${slug} #${String(doc.id)}${isDraft ? ' [draft]' : ''}`
          report(target, locale, result.paths)
          if (isDraft) needsPublish.push(`${slug} #${String(doc.id)} (${locale})`)
          if (!APPLY) continue
          try {
            await payload.update({
              collection: slug,
              id: doc.id as number | string,
              data: changedTopLevelFields(doc, result.value) as never,
              depth: 0,
              draft: isDraft,
              locale,
              overrideAccess: true,
              context,
            })
          } catch (error) {
            failures += 1
            payload.logger.error({ err: error }, `[rebrand] failed: ${target} (${locale})`)
          }
        }
      }
    }
  }

  payload.logger.info(
    `[rebrand] ${changedDocs} document-locale(s) ${APPLY ? 'updated' : 'to update'}, ${failures} failure(s)`,
  )
  if (needsPublish.length) {
    payload.logger.warn(
      `[rebrand] latest version is an unpublished draft — review & publish in Admin: ${needsPublish.join('; ')}`,
    )
  }
  if (APPLY && changedDocs) {
    payload.logger.info('[rebrand] next: POST /api/apps/revalidate (admin) or restart the app')
  }
} catch (error) {
  failures += 1
  payload.logger.error({ err: error }, '[rebrand] aborted')
} finally {
  await payload.destroy()
}
// Explicit exit: `payload run` does not propagate `process.exitCode`.
process.exit(failures ? 1 : 0)
