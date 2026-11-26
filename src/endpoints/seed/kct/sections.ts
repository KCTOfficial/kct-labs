import { MAX_HIGHLIGHTS } from '@/utilities/apps/sectionLimits'

/**
 * Pure merge helpers of the seed for the app page sections. The seed only adds what the existing
 * content already implies (feature icons, highlights from feature labels) and never overwrites an
 * editor's work, so a re-run after editing changes nothing the editor touched.
 */

/** A feature row as read back from the CMS in ONE locale (`fallbackLocale: false`). */
export type ExistingFeatureRow = {
  id?: string | null
  label?: string | null
  icon?: string | null
  description?: string | null
}

export type SeedHighlight = { icon?: string; title: string }

/** Matches the CMS limit of `highlights[].title`. */
export const HIGHLIGHT_TITLE_MAX = 40

/**
 * True when an editor has taken over the feature rows, so the seed must leave the whole field
 * alone (labels included): a row count that differs from the seed's, a description, or an icon
 * other than the seed's at that position (also what reordering looks like). Rows that only have
 * labels, or exactly what the seed wrote, are not edited. `existingByLocale` are the rows read per
 * locale without fallback; the check holds if ANY locale was edited.
 */
export const featuresEditedByEditor = (
  existingByLocale: ExistingFeatureRow[][],
  seedCount: number,
  seedIcons: readonly string[],
): boolean =>
  existingByLocale.some(
    (rows) =>
      (rows.length > 0 && rows.length !== seedCount) ||
      rows.some(
        (row, index) => Boolean(row.description) || (row.icon && row.icon !== seedIcons[index]),
      ),
  )

/**
 * Feature rows for one locale (only called while the editor has NOT taken over, see above). Rows
 * are matched by index (the seed's existing convention) so ids survive; an icon already on the row
 * is kept, otherwise the seed's is filled in.
 */
export const mergeFeatureRows = (
  labels: string[],
  icons: readonly string[],
  existing: ExistingFeatureRow[] | null | undefined,
): Array<{ id: string | undefined; label: string; icon?: string }> =>
  labels.map((label, index) => {
    const row = existing?.[index]
    return { id: row?.id ?? undefined, label, icon: row?.icon || icons[index] || undefined }
  })

/**
 * Highlight rows for one locale, or `undefined` to leave the field alone. `existingAtStart` are the
 * rows the app had BEFORE this seed run: if there were any, an editor owns the field. `rowsSoFar`
 * are the rows returned by the previous locale's write, so the second locale fills the same rows.
 */
export const mergeHighlights = (
  seed: SeedHighlight[],
  existingAtStart: unknown[] | null | undefined,
  rowsSoFar?: Array<{ id?: string | null }> | null,
): Array<{ id: string | undefined; icon?: string; title: string }> | undefined => {
  if ((existingAtStart?.length ?? 0) > 0 || seed.length === 0) return undefined
  return seed.map((row, index) => ({ ...row, id: rowsSoFar?.[index]?.id ?? undefined }))
}

/**
 * Which features become highlights: the first ones whose label fits the title limit in BOTH
 * languages, so the rows line up across locales.
 */
export const highlightIndexes = (en: string[], id: string[]): number[] =>
  en
    .map((_label, index) => index)
    .filter(
      (index) =>
        en[index]!.length <= HIGHLIGHT_TITLE_MAX && (id[index]?.length ?? 0) <= HIGHLIGHT_TITLE_MAX,
    )
    .slice(0, MAX_HIGHLIGHTS)
