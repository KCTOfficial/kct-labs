import type { CollectionBeforeDeleteHook } from 'payload'

import { stripLocale } from '@/i18n/config'
import { legalIndexPath } from '@/utilities/legal/paths'

/**
 * An app owns its legal documents: delete them (and the slug redirects pointing at them) in the
 * same transaction, so a failed app delete leaves everything intact.
 */
export const cascadeDeleteDocuments: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const app = await req.payload.findByID({
    collection: 'apps',
    id,
    depth: 0,
    draft: true,
    disableErrors: true,
    overrideAccess: true,
    req,
    select: { slug: true },
  })

  await req.payload.delete({
    collection: 'app-documents',
    where: { app: { equals: id } },
    overrideAccess: true,
    req,
  })

  if (!app?.slug) return

  const prefix = `${legalIndexPath(app.slug)}/`
  // `like` narrows the scan; the exact prefix check on the locale-free path (unprefixed, `/en` and
  // legacy `/id` rows) avoids matching other apps.
  const { docs } = await req.payload.find({
    collection: 'redirects',
    where: { 'to.url': { like: prefix } },
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    select: { to: true },
  })
  const ids = docs
    .filter((r) => {
      const url = r.to?.url ?? ''
      return stripLocale(url).startsWith(prefix)
    })
    .map((r) => r.id)
  if (ids.length === 0) return

  await req.payload.delete({
    collection: 'redirects',
    where: { id: { in: ids } },
    overrideAccess: true,
    req,
  })
}
