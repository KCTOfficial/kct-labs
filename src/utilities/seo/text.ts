import { DESCRIPTION_MAX_LENGTH, SITE_NAME, TITLE_MAX_LENGTH } from './constants'

/** Collapses whitespace and truncates on a word boundary with an ellipsis. */
export const truncate = (value: string, max: number): string => {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, '')}…`
}

/**
 * `"Al Quran Imam"` → `"Al Quran Imam | KCT Labs"`. Titles that already contain the site name are kept.
 * The page part is truncated so the full title stays within ~60 characters.
 */
export const formatTitle = (title?: string | null): string => {
  const clean = title?.replace(/\s+/g, ' ').trim()
  if (!clean) return SITE_NAME
  if (clean.includes(SITE_NAME)) return truncate(clean, TITLE_MAX_LENGTH)
  const suffix = ` | ${SITE_NAME}`
  return `${truncate(clean, TITLE_MAX_LENGTH - suffix.length)}${suffix}`
}

export const formatDescription = (
  ...candidates: Array<string | null | undefined>
): string | undefined => {
  const found = candidates.find((c) => typeof c === 'string' && c.trim().length > 0)
  return found ? truncate(found, DESCRIPTION_MAX_LENGTH) : undefined
}
