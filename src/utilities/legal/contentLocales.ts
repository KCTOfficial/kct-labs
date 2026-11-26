import { defaultLocale, locales, type Locale } from '@/i18n/config'

/**
 * Pure helpers for the languages a legal document has its OWN content in (`contentLocales`).
 * Legal text is never silently in the wrong language: a page whose locale is missing shows the
 * text of another locale with a notice, and SEO points at the locale that really has the text.
 */

export const isFullyTranslated = (contentLocales: readonly Locale[]): boolean =>
  locales.every((l) => contentLocales.includes(l))

/** The language shown when the requested one is missing: the default locale when it has content. */
export const primaryContentLocale = (contentLocales: readonly Locale[]): Locale =>
  contentLocales.includes(defaultLocale) || contentLocales.length === 0
    ? defaultLocale
    : contentLocales[0]

/** Read fallback for legal content: every other locale, in config order. */
export const legalFallbackLocales = (locale: Locale): Locale[] =>
  locales.filter((l) => l !== locale)
