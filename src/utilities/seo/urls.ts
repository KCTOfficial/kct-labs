import { defaultLocale, localeTags, localizeHref, locales, type Locale } from '@/i18n/config'

import { getServerSideURL } from '../getURL'

/** Absolute URL for a site path. Strips a trailing slash from the base (except root). */
export const absoluteUrl = (path: string): string => {
  const base = getServerSideURL().replace(/\/+$/, '')
  if (!path || path === '/') return `${base}/`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/** Absolute, locale-prefixed URL. `('/apps', 'en')` → `https://site/en/apps`. */
export const localizedUrl = (path: string, locale: Locale): string =>
  absoluteUrl(localizeHref(path, locale))

export type Alternates = {
  canonical: string
  languages?: Record<string, string>
}

/**
 * Canonical + hreflang alternates for a page that exists in every locale.
 * `x-default` points to the default (unprefixed) URL.
 */
export const buildAlternates = (path: string, locale: Locale): Alternates => {
  const languages: Record<string, string> = {}
  for (const l of locales) languages[localeTags[l]] = localizedUrl(path, l)
  languages['x-default'] = localizedUrl(path, defaultLocale)

  return { canonical: localizedUrl(path, locale), languages }
}

/**
 * Pages whose content is NOT translated (template Pages/Posts, legal documents in one language):
 * a single canonical in the content's locale (default locale unless given) prevents duplicate
 * content between `/x` and `/en/x`.
 */
export const buildSingleLanguageAlternates = (
  path: string,
  locale: Locale = defaultLocale,
): Alternates => ({
  canonical: localizedUrl(path, locale),
})
