import { isAppSort, normalizePage, normalizeSearch, type AppSort } from '@/utilities/apps/params'

export type ListingParams = { q: string; category: string; sort: AppSort; page: number }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Validates untrusted query params; anything unexpected falls back to defaults. */
export const parseListingParams = (
  raw: Record<string, string | string[] | undefined>,
): ListingParams => {
  const category = first(raw.category)?.toLowerCase().trim() ?? ''
  const sort = first(raw.sort)
  return {
    q: normalizeSearch(first(raw.q)),
    category: category.length <= 80 && SLUG_PATTERN.test(category) ? category : '',
    sort: isAppSort(sort) ? sort : 'featured',
    page: normalizePage(first(raw.page)),
  }
}

/** Builds `/apps?…` keeping only non-default values so URLs stay short and canonical-friendly. */
export const listingHref = (base: string, params: Partial<ListingParams>): string => {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.category) search.set('category', params.category)
  if (params.sort && params.sort !== 'featured') search.set('sort', params.sort)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}
