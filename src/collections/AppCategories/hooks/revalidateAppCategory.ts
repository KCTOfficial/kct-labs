import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

import type { AppCategory } from '@/payload-types'
import { APPS_CACHE_TAG, APPS_SITEMAP_CACHE_TAG } from '@/utilities/apps/cacheTags'

// Category titles are rendered inside app cards and filters, so app caches must be refreshed too.
const revalidate = () => {
  revalidateTag(APPS_CACHE_TAG, 'max')
  revalidateTag(APPS_SITEMAP_CACHE_TAG, 'max')
}

export const revalidateAppCategory: CollectionAfterChangeHook<AppCategory> = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating app category: ${doc.slug}`)
    revalidate()
  }
  return doc
}

export const revalidateAppCategoryDelete: CollectionAfterDeleteHook<AppCategory> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) revalidate()
  return doc
}
