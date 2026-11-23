import type { PayloadRequest } from 'payload'

/**
 * Drafts (incl. autosave) are written to versions only, so `originalDoc`/`previousDoc` describe the
 * latest draft. Publish-time rules (effective date, slug redirects) must compare against the live
 * document instead; this reads it once per operation and shares it between hooks via `req.context`.
 */
export type PublishedSnapshot = {
  isPublished: boolean
  slug?: string | null
  app?: number | { id: number; slug?: string | null } | null
  markdown: Record<string, string | null | undefined>
  effectiveDate?: string | null
}

/**
 * Local API calls that receive `req` overwrite `req.locale`/`req.fallbackLocale` (createLocalReq),
 * which would leak `'all'` into the rest of the running operation. Restore them afterwards.
 */
export const withRequestLocale = async <T>(req: PayloadRequest, run: () => Promise<T>) => {
  const { fallbackLocale, locale } = req
  try {
    return await run()
  } finally {
    req.locale = locale
    req.fallbackLocale = fallbackLocale
  }
}

const contextKey = (id: number | string) => `appDocumentPublished:${id}`

/**
 * Must run in `beforeChange`: by `afterChange` the live row already holds the new values.
 * Cached per document so every hook of one operation sees the same, pre-save state.
 */
export const loadPublishedSnapshot = async (
  id: number | string,
  req: PayloadRequest,
): Promise<PublishedSnapshot> => {
  const cached = getPublishedSnapshot(id, req)
  if (cached) return cached
  const doc = await withRequestLocale(req, () =>
    req.payload.findByID({
      collection: 'app-documents',
      id,
      depth: 0,
      draft: false,
      locale: 'all',
      overrideAccess: true,
      req,
      select: { _status: true, app: true, effectiveDate: true, markdown: true, slug: true },
    }),
  )
  const snapshot: PublishedSnapshot = {
    isPublished: doc._status === 'published',
    slug: doc.slug,
    app: doc.app as PublishedSnapshot['app'],
    markdown: (doc.markdown ?? {}) as unknown as PublishedSnapshot['markdown'],
    effectiveDate: doc.effectiveDate,
  }
  req.context[contextKey(id)] = snapshot
  return snapshot
}

export const getPublishedSnapshot = (
  id: number | string,
  req: PayloadRequest,
): PublishedSnapshot | undefined => req.context[contextKey(id)] as PublishedSnapshot | undefined

export const clearPublishedSnapshot = (id: number | string, req: PayloadRequest): void => {
  delete req.context[contextKey(id)]
}
