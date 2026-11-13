/** Pure helpers for app listing parameters (no Payload imports, safe for unit tests). */
export const APPS_PAGE_SIZE = 12
export const SEARCH_MAX_LENGTH = 80

export const appSortOptions = ['featured', 'newest', 'name'] as const
export type AppSort = (typeof appSortOptions)[number]
export const SORT_DEFAULT: AppSort = 'featured'

export const isAppSort = (value: unknown): value is AppSort =>
  typeof value === 'string' && (appSortOptions as readonly string[]).includes(value)

/** Normalises user search input: trims, collapses whitespace, caps length. */
export const normalizeSearch = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX_LENGTH) : ''

/** Positive integer page number, defaulting to 1 for anything invalid. */
export const normalizePage = (value: unknown): number => {
  const n =
    typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number.parseInt(value, 10) : NaN
  return Number.isFinite(n) && n > 0 && n < 10_000 ? n : 1
}
