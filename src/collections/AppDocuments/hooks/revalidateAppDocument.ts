import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

import type { AppDocument } from '@/payload-types'
import { APPS_SITEMAP_CACHE_TAG } from '@/utilities/apps/cacheTags'
import { APP_DOCUMENTS_CACHE_TAG } from '@/utilities/legal/constants'

const revalidate = () => {
  revalidateTag(APP_DOCUMENTS_CACHE_TAG, 'max')
  revalidateTag(APPS_SITEMAP_CACHE_TAG, 'max')
}

export const revalidateAppDocument: CollectionAfterChangeHook<AppDocument> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  if (doc._status === 'published' || previousDoc?._status === 'published') {
    payload.logger.info(`Revalidating app document: ${doc.slug}`)
    revalidate()
  }
  return doc
}

export const revalidateAppDocumentDelete: CollectionAfterDeleteHook<AppDocument> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) revalidate()
  return doc
}
