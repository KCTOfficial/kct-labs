import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { type DataFromGlobalSlug, getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

type Global = keyof Config['globals']

async function getGlobal<T extends Global>(slug: T, depth = 0): Promise<DataFromGlobalSlug<T>> {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
  })

  return global
}

/**
 * Locale-aware variant: the cache key includes the locale so translations never leak between locales.
 * Uses the same `global_<slug>` tag, so the existing revalidate hooks keep working.
 */
export const getCachedLocalizedGlobal = <T extends Global>(
  slug: T,
  locale: Config['locale'],
  depth = 0,
) =>
  unstable_cache(
    async (): Promise<DataFromGlobalSlug<T>> => {
      const payload = await getPayload({ config: configPromise })
      return payload.findGlobal({ slug, depth, locale })
    },
    [slug, locale, String(depth)],
    { tags: [`global_${slug}`] },
  )

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedGlobal = <T extends Global>(slug: T, depth = 0) =>
  unstable_cache(async () => getGlobal<T>(slug, depth), [slug], {
    tags: [`global_${slug}`],
  })
