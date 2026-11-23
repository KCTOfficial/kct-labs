import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import type { App } from '@/payload-types'

export const SLUG_LOCKED_MESSAGE =
  'This app has published legal documents linked from Google Play. Renaming the slug breaks those URLs; confirm the slug change to continue.'

/**
 * Published legal URLs live under the app slug and are linked from Google Play, and no redirect is
 * created for app renames. The server enforces the confirmation so Local API/REST cannot skip it.
 */
export const guardSlugChange: CollectionBeforeChangeHook<App> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc?.slug) return data
  if (data.slug === undefined || data.slug === originalDoc.slug) return data
  if ((data as { confirmSlugChange?: boolean }).confirmSlugChange === true) return data

  const { totalDocs } = await req.payload.count({
    collection: 'app-documents',
    where: { and: [{ app: { equals: originalDoc.id } }, { _status: { equals: 'published' } }] },
    overrideAccess: true,
    req,
  })
  if (totalDocs === 0) return data

  throw new ValidationError({
    collection: 'apps',
    errors: [{ message: SLUG_LOCKED_MESSAGE, path: 'slug' }],
    req,
  })
}
