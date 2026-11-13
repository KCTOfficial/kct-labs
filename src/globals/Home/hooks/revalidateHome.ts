import type { GlobalAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache'

import { HOME_CACHE_TAG } from '@/utilities/apps/cacheTags'

export const revalidateHome: GlobalAfterChangeHook = ({ doc, req: { context, payload } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info('Revalidating home')
    revalidateTag(HOME_CACHE_TAG, 'max')
  }
  return doc
}
