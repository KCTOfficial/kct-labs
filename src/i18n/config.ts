/**
 * Locale configuration shared by Payload (content localization), the routing proxy and the frontend.
 *
 * URL strategy: the default locale (English) is served WITHOUT a prefix (`/`, `/apps/...`) so every
 * pre-existing URL keeps working. Other locales are prefixed (`/id/...`). Internally every frontend
 * route lives under `app/(frontend)/[locale]`, the proxy rewrites unprefixed URLs to `/en/...`.
 */
export const locales = ['en', 'id'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
}

/** BCP 47 tags used for `<html lang>`, `hreflang` and Intl formatting. */
export const localeTags: Record<Locale, string> = {
  en: 'en',
  id: 'id',
}

/** Open Graph locale format (language_TERRITORY). */
export const ogLocales: Record<Locale, string> = {
  en: 'en_US',
  id: 'id_ID',
}

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (locales as readonly string[]).includes(value)

const isExternalHref = (href: string): boolean =>
  /^[a-z][a-z\d+\-.]*:/i.test(href) || href.startsWith('//')

/**
 * Removes any locale prefix from a pathname — including the default one, because during SSR
 * `usePathname()` returns the internal rewritten path (`/en/apps`), not the public URL.
 * `/id/apps` → `/apps`, `/en/apps` → `/apps`, `/id` → `/`, `/apps` → `/apps`.
 */
export const stripLocale = (pathname: string): string => {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return '/'
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1)
  }
  return pathname || '/'
}

/**
 * Builds a locale-aware internal href. External URLs, anchors, mailto/tel links are returned untouched.
 * `localizeHref('/apps', 'id')` → `/id/apps`, `localizeHref('/apps', 'en')` → `/apps`.
 */
export const localizeHref = (href: string, locale: Locale): string => {
  if (!href || isExternalHref(href) || href.startsWith('#') || href.startsWith('?')) return href
  if (!href.startsWith('/')) return href

  const [pathPart, ...rest] = href.split(/(?=[?#])/)
  const basePath = stripLocale(pathPart || '/')
  const suffix = rest.join('')

  if (locale === defaultLocale) return `${basePath}${suffix}`
  return `${basePath === '/' ? `/${locale}` : `/${locale}${basePath}`}${suffix}`
}
