import type { ISitemapField } from 'next-sitemap'

import { locales, type Locale } from '@/i18n/config'
import { localizedSitemapEntries, singleLocaleSitemapEntry } from '@/utilities/seo/sitemap'

import { isFullyTranslated, primaryContentLocale } from './contentLocales'
import { legalDocPath, legalIndexPath } from './paths'
import type { PublicLegalDocPath } from './queries'

const LEGAL_SITEMAP_OPTIONS = { changefreq: 'yearly', priority: 0.4 } as const

const entriesFor = (path: string, lastmod: string, contentLocales: Locale[]): ISitemapField[] =>
  isFullyTranslated(contentLocales)
    ? localizedSitemapEntries(path, lastmod, LEGAL_SITEMAP_OPTIONS)
    : [
        singleLocaleSitemapEntry(
          path,
          lastmod,
          LEGAL_SITEMAP_OPTIONS,
          primaryContentLocale(contentLocales),
        ),
      ]

/**
 * Sitemap entries for legal documents and their per-app index. Archived apps are skipped; a page
 * is listed only in the locales it has its own content in (a missing locale shows another
 * language and would be a duplicate). The index lists every locale any of its documents is in.
 */
export const legalSitemapEntries = (docs: PublicLegalDocPath[]): ISitemapField[] => {
  const indexByApp = new Map<string, { lastmod: string; contentLocales: Set<Locale> }>()
  const entries: ISitemapField[] = []

  for (const doc of docs) {
    if (doc.archived) continue

    entries.push(
      ...entriesFor(legalDocPath(doc.appSlug, doc.docSlug), doc.updatedAt, doc.contentLocales),
    )

    const index = indexByApp.get(doc.appSlug)
    indexByApp.set(doc.appSlug, {
      lastmod: index && index.lastmod > doc.updatedAt ? index.lastmod : doc.updatedAt,
      contentLocales: new Set([...(index?.contentLocales ?? []), ...doc.contentLocales]),
    })
  }

  for (const [appSlug, { lastmod, contentLocales }] of indexByApp) {
    const indexLocales = locales.filter((l) => contentLocales.has(l))
    entries.push(...entriesFor(legalIndexPath(appSlug), lastmod, indexLocales))
  }

  return entries
}
