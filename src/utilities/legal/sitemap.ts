import type { ISitemapField } from 'next-sitemap'

import { localizedSitemapEntries, singleLocaleSitemapEntry } from '@/utilities/seo/sitemap'

import { legalDocPath, legalIndexPath } from './paths'
import type { PublicLegalDocPath } from './queries'

const LEGAL_SITEMAP_OPTIONS = { changefreq: 'yearly', priority: 0.4 } as const

const entriesFor = (path: string, lastmod: string, hasIndonesian: boolean): ISitemapField[] =>
  hasIndonesian
    ? localizedSitemapEntries(path, lastmod, LEGAL_SITEMAP_OPTIONS)
    : [singleLocaleSitemapEntry(path, lastmod, LEGAL_SITEMAP_OPTIONS)]

/**
 * Sitemap entries for legal documents and their per-app index. Archived apps are skipped; a page
 * is listed in Indonesian only when it has Indonesian content (otherwise it falls back to EN and
 * would be a duplicate). The index lists both locales when any of its documents is translated.
 */
export const legalSitemapEntries = (docs: PublicLegalDocPath[]): ISitemapField[] => {
  const indexByApp = new Map<string, { lastmod: string; hasIndonesian: boolean }>()
  const entries: ISitemapField[] = []

  for (const doc of docs) {
    if (doc.archived) continue

    entries.push(
      ...entriesFor(legalDocPath(doc.appSlug, doc.docSlug), doc.updatedAt, doc.hasIndonesian),
    )

    const index = indexByApp.get(doc.appSlug)
    indexByApp.set(doc.appSlug, {
      lastmod: index && index.lastmod > doc.updatedAt ? index.lastmod : doc.updatedAt,
      hasIndonesian: Boolean(index?.hasIndonesian) || doc.hasIndonesian,
    })
  }

  for (const [appSlug, { lastmod, hasIndonesian }] of indexByApp) {
    entries.push(...entriesFor(legalIndexPath(appSlug), lastmod, hasIndonesian))
  }

  return entries
}
