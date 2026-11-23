import type { CollectionBeforeChangeHook } from 'payload'

import type { AppDocument } from '@/payload-types'
import { loadPublishedSnapshot, withRequestLocale } from './publishedSnapshot'

type LocalizedMarkdown = Record<string, string | null | undefined>

const normalize = (value: string | null | undefined) => value ?? ''

const sameInstant = (a: unknown, b: unknown) =>
  (a ? new Date(a as string).getTime() : null) === (b ? new Date(b as string).getTime() : null)

/**
 * On publish, `effectiveDate` becomes today when the markdown of any locale differs from the live
 * document — unless the editor changed `effectiveDate` in the same save.
 */
export const stampEffectiveDate: CollectionBeforeChangeHook<AppDocument> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (data._status !== 'published') return data

  const id = originalDoc?.id
  const published =
    operation === 'update' && id !== undefined ? await loadPublishedSnapshot(id, req) : undefined

  // Compared with the live value: under autosave a manual date already sits in the draft.
  const reference = published ? published.effectiveDate : originalDoc?.effectiveDate
  const isManual = data.effectiveDate !== undefined && !sameInstant(data.effectiveDate, reference)
  if (isManual) return data

  let isChanged = !published?.isPublished
  if (!isChanged && published && id !== undefined) {
    // Unsent locales keep their latest draft value, which is what this publish makes live.
    const latest =
      req.locale === 'all'
        ? {}
        : ((
            await withRequestLocale(req, () =>
              req.payload.findByID({
                collection: 'app-documents',
                id,
                depth: 0,
                draft: true,
                locale: 'all',
                overrideAccess: true,
                req,
                select: { markdown: true },
              }),
            )
          ).markdown as unknown as LocalizedMarkdown)
    const incoming: LocalizedMarkdown =
      req.locale === 'all'
        ? ((data.markdown ?? {}) as unknown as LocalizedMarkdown)
        : {
            ...(latest ?? {}),
            ...(data.markdown !== undefined && req.locale
              ? { [req.locale]: data.markdown as string }
              : {}),
          }
    isChanged = Object.entries(incoming).some(
      ([locale, value]) => normalize(value) !== normalize(published.markdown[locale]),
    )
  }

  if (isChanged) data.effectiveDate = new Date().toISOString()
  return data
}
