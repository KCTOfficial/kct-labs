import { getServerSideSitemap } from 'next-sitemap'

import { getPublicAppSlugs } from '@/utilities/apps/queries'
import { localizedSitemapEntries } from '@/utilities/seo/sitemap'

/**
 * Published, non-archived apps in every locale with hreflang alternates. The underlying query is
 * cached with the `apps`/`apps-sitemap` tags and refreshed by the Apps revalidate hook.
 */
export async function GET() {
  const apps = await getPublicAppSlugs()
  const fallback = new Date().toISOString()

  const latest = apps.reduce<string | null>(
    (max, a) => (a.updatedAt && (!max || a.updatedAt > max) ? a.updatedAt : max),
    null,
  )

  const entries = [
    ...localizedSitemapEntries('/', latest ?? fallback, { changefreq: 'weekly', priority: 1 }),
    ...localizedSitemapEntries('/apps', latest ?? fallback, {
      changefreq: 'weekly',
      priority: 0.9,
    }),
    ...apps.flatMap((app) =>
      localizedSitemapEntries(`/apps/${app.slug}`, app.updatedAt || fallback, {
        changefreq: 'monthly',
        priority: 0.8,
      }),
    ),
  ]

  return getServerSideSitemap(entries)
}
