import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { HomeCatalog } from '@/components/home/HomeCatalog'
import { HomeHero, type ShowcaseApp } from '@/components/home/HomeHero'
import { HomeScrollStory } from '@/components/home/HomeScrollStory'
import { HomeAbout, HomeCta, HomeFeatured, HomeProcess } from '@/components/home/HomeSections'
import { appHref } from '@/components/site/AppCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getDictionary, isLocale, type Locale } from '@/i18n'
import type { App } from '@/payload-types'
import { HERO_SHOWCASE_MAX, normalizeShowcase } from '@/utilities/apps/heroShowcase'
import { getCatalogStats, getHome, getShowcaseApps, listApps } from '@/utilities/apps/queries'
import { generateMeta } from '@/utilities/generateMeta'
import { getCachedLocalizedGlobal } from '@/utilities/getGlobals'
import { itemListSchema, organizationSchema, websiteSchema } from '@/utilities/seo/structuredData'
import { absoluteUrl } from '@/utilities/seo/urls'

type Args = { params: Promise<{ locale: string }> }

const resolveLocale = async (params: Args['params']): Promise<Locale> => {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return locale
}

const isPublicApp = (value: unknown): value is App =>
  Boolean(
    value && typeof value === 'object' && 'slug' in value && (value as App).status !== 'archived',
  )

export default async function HomePage({ params }: Args) {
  const locale = await resolveLocale(params)
  const dict = getDictionary(locale)

  const home = await getHome(locale)
  const limit = home.catalog?.limit ?? 7

  const [stats, catalog, footer] = await Promise.all([
    getCatalogStats(locale),
    listApps({ locale, sort: 'featured', limit }),
    getCachedLocalizedGlobal('footer', locale, 0)(),
  ])

  // Showcase: editor-picked apps, otherwise the top featured apps.
  const picked = normalizeShowcase((home.hero?.showcaseApps ?? []).filter(isPublicApp))
  const showcase: ShowcaseApp[] = picked.length
    ? picked
    : normalizeShowcase(await getShowcaseApps(locale, HERO_SHOWCASE_MAX))

  const showFeatured = Boolean(
    home.featured?.enabled && home.featured?.title && isPublicApp(home.featured?.app),
  )
  const showProcess = Boolean(home.process?.enabled && home.process?.steps?.length)
  const showAbout = Boolean(home.about?.enabled && home.about?.title)
  const showCta = Boolean(home.cta?.enabled && home.cta?.title)

  let sectionIndex = 1
  const next = () => sectionIndex++
  const catalogIndex = next()
  const featuredIndex = showFeatured ? next() : 0
  const processIndex = showProcess ? next() : 0
  const aboutIndex = showAbout ? next() : 0

  return (
    <>
      <JsonLd
        data={[
          organizationSchema({ email: footer?.contact?.email, phone: footer?.contact?.phone }),
          websiteSchema(locale, home.meta?.description || dict.meta.defaultDescription),
          itemListSchema(
            catalog.docs.map((app) => ({
              name: app.name,
              url: absoluteUrl(appHref(app.slug, locale)),
            })),
          ),
        ]}
      />
      <HomeHero
        dict={dict}
        hero={home.hero}
        locale={locale}
        showcase={showcase}
        stats={{
          totalApps: stats.totalApps,
          totalCategories: stats.categories.length,
          topDownloadsLabel: stats.topDownloadsLabel,
        }}
      />
      <HomeCatalog
        apps={catalog.docs}
        catalog={home.catalog}
        categories={stats.categories}
        dict={dict}
        index={catalogIndex}
        locale={locale}
        totalApps={stats.totalApps}
      />
      {showFeatured && (
        <HomeFeatured dict={dict} featured={home.featured} index={featuredIndex} locale={locale} />
      )}
      {showProcess && <HomeProcess dict={dict} index={processIndex} process={home.process} />}
      {showAbout && <HomeAbout about={home.about} index={aboutIndex} locale={locale} />}
      {showCta && <HomeCta cta={home.cta} />}
      {/* Desktop scroll-scrubbed motion; rebuilt whenever the rendered layout changes. */}
      <HomeScrollStory
        layoutKey={[
          showFeatured,
          showProcess,
          showAbout,
          showCta,
          showcase.map((app) => app.id).join('.'),
          catalog.docs.length,
        ].join('|')}
      />
    </>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const dict = getDictionary(locale)
  const home = await getHome(locale)

  return generateMeta({
    doc: { meta: home.meta },
    fallbackDescription: home.hero?.subheadline || dict.meta.defaultDescription,
    fallbackTitle: dict.meta.defaultTitle,
    locale,
    path: '/',
    translated: true,
  })
}
