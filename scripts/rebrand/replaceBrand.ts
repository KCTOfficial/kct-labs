/**
 * Pure helpers for the one-off KCT Labs → KCT Hub content rebrand (scripts/rebrand-content.ts).
 * No Payload/DB access here so the behaviour is unit-tested (tests/int/rebrand.int.spec.ts).
 */

export const LEGACY_BRAND = 'KCT Labs'
export const NEW_BRAND = 'KCT Hub'

/**
 * Whole-word "KCT Labs" with a normal or non-breaking space, any casing ("KCT labs", "KCT LABS").
 * Identifiers such as `kct-labs` (hyphen) never match, so slugs, URLs and file names stay intact.
 */
const LEGACY_PATTERN = /\bKCT[  ]Labs\b/gi

/** Keys whose values are identifiers, never display text — skipped even if they matched. */
const SKIPPED_KEYS = new Set(['id', 'slug', 'url', 'filename', 'mimeType', 'packageId'])

export type ReplaceResult<T> = { value: T; replacements: number; paths: string[] }

const replaceInString = (text: string): { text: string; count: number } => {
  let count = 0
  const replaced = text.replace(LEGACY_PATTERN, () => {
    count += 1
    return NEW_BRAND
  })
  return { text: replaced, count }
}

/**
 * Returns a copy of `value` with every legacy brand mention replaced (copy-on-write: untouched
 * branches keep their identity, an unchanged input is returned as-is). Works on plain JSON:
 * Payload documents at depth 0, including Lexical rich text (`text` leaves).
 */
export const replaceBrandDeep = <T>(value: T, path = ''): ReplaceResult<T> => {
  if (typeof value === 'string') {
    const { text, count } = replaceInString(value)
    return { value: (count ? text : value) as T, replacements: count, paths: count ? [path] : [] }
  }
  if (Array.isArray(value)) {
    let replacements = 0
    const paths: string[] = []
    let next: unknown[] | null = null
    value.forEach((item, index) => {
      const result = replaceBrandDeep(item, `${path}[${index}]`)
      if (!result.replacements) return
      next ??= [...value]
      next[index] = result.value
      replacements += result.replacements
      paths.push(...result.paths)
    })
    return { value: (next ?? value) as T, replacements, paths }
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    let replacements = 0
    const paths: string[] = []
    let next: Record<string, unknown> | null = null
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SKIPPED_KEYS.has(key)) continue
      const result = replaceBrandDeep(child, path ? `${path}.${key}` : key)
      if (!result.replacements) continue
      next ??= { ...(value as Record<string, unknown>) }
      next[key] = result.value
      replacements += result.replacements
      paths.push(...result.paths)
    }
    return { value: (next ?? value) as T, replacements, paths }
  }
  return { value, replacements: 0, paths: [] }
}

/** Top-level fields that changed — the minimal `data` to send to Payload's update. */
export const changedTopLevelFields = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, unknown> => {
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(after)) {
    if (after[key] !== before[key]) data[key] = after[key]
  }
  return data
}
