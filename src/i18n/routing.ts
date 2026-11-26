import { defaultLocale, locales } from './config'

export type LocaleRouteDecision =
  { type: 'redirect'; pathname: string } | { type: 'rewrite'; pathname: string } | { type: 'next' }

const hasPrefix = (pathname: string, locale: string) =>
  pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)

/**
 * Pure routing decision used by `src/proxy.ts` (kept separate so it can be unit tested).
 *
 * - `/id/...`  → 308 redirect to the unprefixed URL (default locale has exactly one canonical URL).
 * - `/en/...`  → served as-is by the `[locale]` segment.
 * - anything else → internally rewritten to `/id/...` (URL in the browser stays unprefixed).
 */
export const resolveLocaleRoute = (pathname: string): LocaleRouteDecision => {
  if (hasPrefix(pathname, defaultLocale)) {
    const stripped = pathname.slice(defaultLocale.length + 1)
    return { type: 'redirect', pathname: stripped || '/' }
  }

  for (const locale of locales) {
    if (locale !== defaultLocale && hasPrefix(pathname, locale)) return { type: 'next' }
  }

  return {
    type: 'rewrite',
    pathname: pathname === '/' ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`,
  }
}
