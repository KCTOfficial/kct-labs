import type { Endpoint } from 'payload'

import { revalidateTag } from 'next/cache'

import { APPS_CACHE_TAG, APPS_SITEMAP_CACHE_TAG, HOME_CACHE_TAG } from '@/utilities/apps/cacheTags'

/**
 * `POST /api/apps/revalidate` — refreshes every KCT Labs cache (apps, home, header, footer, sitemap).
 * Needed after bulk changes made outside the running app (e.g. `pnpm seed:kct`, direct DB imports),
 * where the per-document revalidate hooks cannot reach the Next.js cache. Authenticated users only.
 */
export const revalidateAllEndpoint: Endpoint = {
  path: '/revalidate',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ message: 'Unauthorized' }, { status: 401 })

    for (const tag of [
      APPS_CACHE_TAG,
      APPS_SITEMAP_CACHE_TAG,
      HOME_CACHE_TAG,
      'global_header',
      'global_footer',
    ]) {
      revalidateTag(tag, 'max')
    }
    req.payload.logger.info('Revalidated all KCT Labs caches')
    return Response.json({ revalidated: true })
  },
}
