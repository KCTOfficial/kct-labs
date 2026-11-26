import { defaultLocale, isLocale, type Locale } from '@/i18n/config'

/** Pure and client-safe (used by the quick-view click interceptor and the public endpoint). */

export const SLUG_MAX_LENGTH = 80
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Same shape the Payload slug field produces: lowercase kebab-case, bounded length. */
export const isValidSlug = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= SLUG_MAX_LENGTH &&
  SLUG_PATTERN.test(value)

export type AppDetailPath = { slug: string; locale: Locale }

/**
 * Parses a public pathname into an app detail route:
 * `/apps/x` → id (default), `/en/apps/x` → en, `/id/apps/x` → id. Anything else (listing, extra segments,
 * invalid or percent-encoded slugs, unknown locales) → `null`. Trailing slashes are ignored.
 */
export const parseAppDetailPath = (pathname: string): AppDetailPath | null => {
  const segments = pathname.split('/').filter(Boolean)

  let locale: Locale = defaultLocale
  if (segments.length === 3 && isLocale(segments[0])) {
    locale = segments[0]
    segments.shift()
  }

  if (segments.length !== 2 || segments[0] !== 'apps') return null
  return isValidSlug(segments[1]) ? { slug: segments[1], locale } : null
}

export const isAppDetailPath = (pathname: string): boolean => parseAppDetailPath(pathname) !== null
