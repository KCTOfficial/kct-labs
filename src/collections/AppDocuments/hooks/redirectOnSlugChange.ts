import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

import type { AppDocument } from '@/payload-types'
import { localizeHref, locales } from '@/i18n/config'
import { legalDocPath } from '@/utilities/legal/paths'
import { getPublishedSnapshot, type PublishedSnapshot } from './publishedSnapshot'

type AppRef = PublishedSnapshot['app'] | AppDocument['app']

const resolveAppSlug = async (app: AppRef, req: PayloadRequest): Promise<string | null> => {
  if (!app) return null
  if (typeof app === 'object' && 'slug' in app && app.slug) return app.slug
  const id = typeof app === 'object' ? app.id : app
  const found = await req.payload.findByID({
    collection: 'apps',
    id,
    depth: 0,
    draft: false,
    overrideAccess: true,
    req,
    select: { slug: true },
  })
  return found?.slug ?? null
}

/** Points `from` at `to`, replacing an earlier redirect with the same source (sources are unique). */
const upsertRedirect = async (from: string, to: string, req: PayloadRequest) => {
  const data = { from, to: { type: 'custom' as const, url: to } }
  const existing = await req.payload.find({
    collection: 'redirects',
    where: { from: { equals: from } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
  })
  if (existing.docs[0]) {
    await req.payload.update({
      collection: 'redirects',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
      req,
    })
    return
  }
  await req.payload.create({ collection: 'redirects', data, overrideAccess: true, req })
}

/**
 * A published legal URL is linked from Google Play, so renaming its slug leaves a 301 for every
 * locale. `to.type: 'custom'` keeps the redirects schema unchanged. A redirect whose source is the
 * new URL (slug changed back) is removed so the live page is not shadowed.
 */
export const redirectOnSlugChange: CollectionAfterChangeHook<AppDocument> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (doc._status !== 'published') return doc

  const snapshot = getPublishedSnapshot(doc.id, req)
  const before = snapshot
    ? { isPublished: snapshot.isPublished, slug: snapshot.slug, app: snapshot.app }
    : {
        isPublished: previousDoc?._status === 'published',
        slug: previousDoc?.slug,
        app: previousDoc?.app,
      }
  if (!before.isPublished || !before.slug || before.slug === doc.slug) return doc

  const [oldAppSlug, newAppSlug] = await Promise.all([
    resolveAppSlug(before.app, req),
    resolveAppSlug(doc.app, req),
  ])
  if (!oldAppSlug || !newAppSlug) return doc

  const oldPath = legalDocPath(oldAppSlug, before.slug)
  const newPath = legalDocPath(newAppSlug, doc.slug)

  for (const locale of locales) {
    const from = localizeHref(oldPath, locale)
    const to = localizeHref(newPath, locale)
    await upsertRedirect(from, to, req)
    await req.payload.delete({
      collection: 'redirects',
      where: { from: { equals: to } },
      overrideAccess: true,
      req,
    })
  }

  req.payload.logger.info(`Created legal document redirects for ${oldPath}`)
  return doc
}
