import type { ISitemapField } from 'next-sitemap'

import { defaultLocale, localeTags, locales, type Locale } from '@/i18n/config'

import { localizedUrl } from './urls'

/**
 * One sitemap entry per locale for a translated page, each listing every language version
 * (`xhtml:link rel="alternate" hreflang`) plus `x-default`, as Google recommends.
 */
export const localizedSitemapEntries = (
  path: string,
  lastmod: string,
  options: Pick<ISitemapField, 'changefreq' | 'priority'> = {},
): ISitemapField[] => {
  const alternateRefs = [
    ...locales.map((l) => ({
      href: localizedUrl(path, l),
      hreflang: localeTags[l],
      hrefIsAbsolute: true,
    })),
    { href: localizedUrl(path, defaultLocale), hreflang: 'x-default', hrefIsAbsolute: true },
  ]

  return locales.map((locale) => ({
    loc: localizedUrl(path, locale),
    lastmod,
    alternateRefs,
    ...options,
  }))
}

/** Page available in one language only (no translation yet): a single entry, no alternates. */
export const singleLocaleSitemapEntry = (
  path: string,
  lastmod: string,
  options: Pick<ISitemapField, 'changefreq' | 'priority'> = {},
  locale: Locale = defaultLocale,
): ISitemapField => ({
  loc: localizedUrl(path, locale),
  lastmod,
  ...options,
})
