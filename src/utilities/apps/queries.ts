import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload, type Where } from 'payload'

import type { Locale } from '@/i18n/config'
import type { App, AppCategory, Home } from '@/payload-types'

import { APPS_CACHE_TAG, APPS_SITEMAP_CACHE_TAG, HOME_CACHE_TAG } from './cacheTags'
import { parseDownloads } from './validation'

import { APPS_PAGE_SIZE, SORT_DEFAULT, normalizeSearch, type AppSort } from './params'

export * from './params'

/** Fields needed to render an app card — keep listing payloads small. */
const cardSelect = {
  name: true,
  slug: true,
  shortDescription: true,
  icon: true,
  category: true,
  status: true,
  downloadsLabel: true,
} as const

export type AppCard = Pick<
  App,
  'id' | 'name' | 'slug' | 'shortDescription' | 'icon' | 'category' | 'status' | 'downloadsLabel'
>

export type CategoryWithCount = Pick<AppCategory, 'id' | 'slug'> & { title: string; count: number }

const SORTS: Record<AppSort, string[]> = {
  featured: ['-featured', 'sortOrder', 'name'],
  newest: ['-publishedAt', 'name'],
  name: ['name'],
}

const publicWhere: Where = { status: { not_equals: 'archived' } }

const getPayloadClient = () => getPayload({ config: configPromise })

/**
 * One query returns the light facts of every public app (category + downloads), from which the
 * per-category counts and home stats are derived in memory — avoids one `count` query per category.
 */
const getCatalogFacts = unstable_cache(
  async (locale: Locale) => {
    const payload = await getPayloadClient()
    const [apps, categories] = await Promise.all([
      payload.find({
        collection: 'apps',
        depth: 0,
        draft: false,
        locale,
        overrideAccess: false,
        pagination: false,
        select: { category: true, downloadsLabel: true },
        where: publicWhere,
      }),
      payload.find({
        collection: 'app-categories',
        depth: 0,
        locale,
        overrideAccess: false,
        pagination: false,
        select: { title: true, slug: true },
        sort: ['sortOrder', 'title'],
      }),
    ])

    const counts = new Map<number, number>()
    let topDownloads: number | null = null
    let topDownloadsLabel: string | null = null

    for (const app of apps.docs) {
      const categoryId = typeof app.category === 'object' ? app.category?.id : app.category
      if (categoryId) counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)

      const downloads = parseDownloads(app.downloadsLabel)
      if (downloads !== null && (topDownloads === null || downloads > topDownloads)) {
        topDownloads = downloads
        topDownloadsLabel = app.downloadsLabel ?? null
      }
    }

    const categoriesWithCount: CategoryWithCount[] = categories.docs
      // Title falls back to the slug if neither the locale nor the fallback locale has one.
      .map((c) => ({
        id: c.id,
        title: c.title || c.slug,
        slug: c.slug,
        count: counts.get(c.id) ?? 0,
      }))
      .filter((c) => c.count > 0)

    return {
      totalApps: apps.docs.length,
      categories: categoriesWithCount,
      topDownloadsLabel,
    }
  },
  ['catalog-facts'],
  { tags: [APPS_CACHE_TAG] },
)

export const getCatalogStats = (locale: Locale) => getCatalogFacts(locale)

export type ListAppsArgs = {
  locale: Locale
  category?: string
  q?: string
  sort?: AppSort
  page?: number
  limit?: number
}

const queryApps = async ({
  locale,
  category,
  q,
  sort = SORT_DEFAULT,
  page = 1,
  limit = APPS_PAGE_SIZE,
}: ListAppsArgs) => {
  const payload = await getPayloadClient()
  const and: Where[] = [publicWhere]

  if (category) {
    const facts = await getCatalogFacts(locale)
    const match = facts.categories.find((c) => c.slug === category)
    // Unknown category → no results (instead of silently ignoring the filter).
    and.push({ category: { equals: match ? match.id : -1 } })
  }

  if (q) {
    and.push({
      or: [
        { name: { like: q } },
        { tagline: { like: q } },
        { shortDescription: { like: q } },
        { slug: { like: q } },
      ],
    })
  }

  const result = await payload.find({
    collection: 'apps',
    depth: 1,
    draft: false,
    limit,
    locale,
    overrideAccess: false,
    page,
    select: cardSelect,
    sort: SORTS[sort],
    where: { and },
  })

  return {
    docs: result.docs as AppCard[],
    page: result.page ?? 1,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    limit,
  }
}

const cachedQueryApps = unstable_cache(
  async (locale: Locale, category: string, sort: AppSort, page: number, limit: number) =>
    queryApps({ locale, category: category || undefined, sort, page, limit }),
  ['list-apps'],
  { tags: [APPS_CACHE_TAG] },
)

/**
 * Paginated public app list. Free-text searches bypass the data cache to avoid unbounded cache keys;
 * category/sort/page combinations are finite and cached.
 */
export const listApps = (args: ListAppsArgs) => {
  const q = normalizeSearch(args.q)
  if (q) return queryApps({ ...args, q })
  return cachedQueryApps(
    args.locale,
    args.category ?? '',
    args.sort ?? SORT_DEFAULT,
    args.page ?? 1,
    args.limit ?? APPS_PAGE_SIZE,
  )
}

const queryAppBySlug = async (slug: string, locale: Locale, draft: boolean) => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'apps',
    depth: 2,
    draft,
    limit: 1,
    locale,
    overrideAccess: draft,
    pagination: false,
    where: { slug: { equals: slug } },
  })
  return result.docs[0] ?? null
}

const cachedAppBySlug = unstable_cache(
  async (slug: string, locale: Locale) => queryAppBySlug(slug, locale, false),
  ['app-by-slug'],
  { tags: [APPS_CACHE_TAG] },
)

export const getAppBySlug = (slug: string, locale: Locale, draft = false) =>
  draft ? queryAppBySlug(slug, locale, true) : cachedAppBySlug(slug, locale)

/** Same-category apps first, topped up with other apps — at most two queries. */
export const getRelatedApps = unstable_cache(
  async (appId: number, categoryId: number | null, locale: Locale, limit: number) => {
    const payload = await getPayloadClient()
    const base = {
      collection: 'apps' as const,
      depth: 1,
      draft: false,
      locale,
      overrideAccess: false,
      pagination: false,
      select: cardSelect,
      sort: SORTS.featured,
    }

    const sameCategory = categoryId
      ? await payload.find({
          ...base,
          limit,
          where: {
            and: [publicWhere, { id: { not_equals: appId } }, { category: { equals: categoryId } }],
          },
        })
      : { docs: [] as AppCard[] }

    const docs = [...(sameCategory.docs as AppCard[])]
    if (docs.length < limit) {
      const exclude = [appId, ...docs.map((d) => d.id)]
      const others = await payload.find({
        ...base,
        limit: limit - docs.length,
        where: { and: [publicWhere, { id: { not_in: exclude } }] },
      })
      docs.push(...(others.docs as AppCard[]))
    }
    return docs
  },
  ['related-apps'],
  { tags: [APPS_CACHE_TAG] },
)

/** Featured apps with screenshots for the hero device stage (fallback when the editor picked none). */
export const getShowcaseApps = unstable_cache(
  async (locale: Locale, limit: number) => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'apps',
      depth: 1,
      draft: false,
      limit,
      locale,
      overrideAccess: false,
      pagination: false,
      select: {
        name: true,
        slug: true,
        shortDescription: true,
        screenshots: true,
        status: true,
      },
      sort: SORTS.featured,
      where: { and: [publicWhere, { screenshots: { exists: true } }] },
    })
    return result.docs as Array<
      Pick<App, 'id' | 'name' | 'slug' | 'shortDescription' | 'screenshots' | 'status'>
    >
  },
  ['showcase-apps'],
  { tags: [APPS_CACHE_TAG] },
)

/** Slugs + lastmod for generateStaticParams and the sitemap. */
export const getPublicAppSlugs = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'apps',
      depth: 0,
      draft: false,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
      where: publicWhere,
    })
    return result.docs
      .filter((d) => Boolean(d.slug))
      .map((d) => ({ slug: d.slug, updatedAt: d.updatedAt }))
  },
  ['public-app-slugs'],
  { tags: [APPS_CACHE_TAG, APPS_SITEMAP_CACHE_TAG] },
)

export const getHome = unstable_cache(
  async (locale: Locale): Promise<Home> => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'home', depth: 2, locale, overrideAccess: false })
  },
  ['global-home'],
  // Home embeds apps (showcase/featured), so it must refresh when apps change too.
  { tags: [HOME_CACHE_TAG, APPS_CACHE_TAG] },
)
