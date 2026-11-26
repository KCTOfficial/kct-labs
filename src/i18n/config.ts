/**
 * Locale configuration shared by Payload (content localization), the routing proxy and the frontend.
 *
 * URL strategy: the default locale (Indonesian) is served WITHOUT a prefix (`/`, `/apps/...`).
 * Other locales are prefixed (`/en/...`); `/id/...` is redirected (308) to the unprefixed URL.
 * Internally every frontend route lives under `app/(frontend)/[locale]`, the proxy rewrites
 * unprefixed URLs to `/id/...`.
 *
 * Keep the order of `locales`: Payload builds the Postgres `_locales` enum from it, so reordering
 * recreates that type (a schema migration). Code that needs the default locale first says so
 * explicitly instead of relying on this order.
 */
export const locales = ['en', 'id'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'id'

/**
 * Per-field read fallback (Payload `localization.locales[].fallbackLocale`): an empty Indonesian
 * field shows the English value. Locales missing here have NO fallback (English never shows
 * Indonesian text).
 */
export const fallbackLocales: Partial<Record<Locale, Locale>> = { id: 'en' }

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
 * `usePathname()` returns the internal rewritten path (`/id/apps`), not the public URL.
 * `/en/apps` → `/apps`, `/id/apps` → `/apps`, `/en` → `/`, `/apps` → `/apps`.
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
 * `localizeHref('/apps', 'en')` → `/en/apps`, `localizeHref('/apps', 'id')` → `/apps`.
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
