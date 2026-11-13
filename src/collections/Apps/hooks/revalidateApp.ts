import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

import type { App } from '@/payload-types'
import { APPS_CACHE_TAG, APPS_SITEMAP_CACHE_TAG } from '@/utilities/apps/cacheTags'

/**
 * All app reads go through `unstable_cache` tagged with `apps`, so invalidating the tag refreshes
 * the home page, listing, detail pages (both locales) and the sitemap at once.
 */
const revalidate = () => {
  revalidateTag(APPS_CACHE_TAG, 'max')
  revalidateTag(APPS_SITEMAP_CACHE_TAG, 'max')
}

export const revalidateApp: CollectionAfterChangeHook<App> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  const isPublished = doc._status === 'published'
  const wasPublished = previousDoc?._status === 'published'

  if (isPublished || wasPublished) {
    payload.logger.info(`Revalidating app: ${doc.slug}`)
    revalidate()
  }

  return doc
}

export const revalidateAppDelete: CollectionAfterDeleteHook<App> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) revalidate()
  return doc
}
