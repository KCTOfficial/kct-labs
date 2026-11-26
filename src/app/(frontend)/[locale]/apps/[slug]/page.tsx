import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { AppDetailHero } from '@/components/apps/detail/AppDetailHero'
import { AppHighlightStrip } from '@/components/apps/detail/AppHighlightStrip'
import { DataControlBanner } from '@/components/apps/detail/DataControlBanner'
import { HowItWorksSection } from '@/components/apps/detail/HowItWorksSection'
import { KeyFeaturesSection } from '@/components/apps/detail/KeyFeaturesSection'
import { LegalLinksRow } from '@/components/apps/detail/LegalLinksRow'
import { heroPhones, toDetailSections } from '@/components/apps/detail/model'
import { RelatedAppRow } from '@/components/apps/detail/RelatedAppRow'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { JsonLd } from '@/components/seo/JsonLd'
import { ButtonLink } from '@/components/site/ButtonLink'
import { Eyebrow } from '@/components/site/Eyebrow'
import { isMedia, toImageSource, type ImageSource } from '@/components/site/media'
import { format, getDictionary, isLocale, localizeHref } from '@/i18n'
import { getAppBySlug, getPublicAppSlugs, getRelatedApps } from '@/utilities/apps/queries'
import { generateMeta } from '@/utilities/generateMeta'
import { legalDocPath, legalIndexPath } from '@/utilities/legal/paths'
import { getAppLegalDocs, resolvePrivacyLink } from '@/utilities/legal/queries'
import { getCachedRedirects } from '@/utilities/getRedirects'
import { breadcrumbSchema, mobileApplicationSchema } from '@/utilities/seo/structuredData'
import { absoluteUrl, localizedUrl } from '@/utilities/seo/urls'

type Args = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const apps = await getPublicAppSlugs()
  return apps.map(({ slug }) => ({ slug }))
}

const resolve = async (params: Args['params']) => {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  return { locale, slug: decodeURIComponent(slug) }
}

const RELATED_LIMIT = 3

export default async function AppDetailPage({ params }: Args) {
  const { locale, slug } = await resolve(params)
  const { isEnabled: draft } = await draftMode()
  const dict = getDictionary(locale)
  const app = await getAppBySlug(slug, locale, draft)

  if (!app) return <PayloadRedirects url={`/apps/${slug}`} />

  const category = typeof app.category === 'object' ? app.category : null
  const [related, legalDocs] = await Promise.all([
    getRelatedApps(app.id, category?.id ?? null, locale, RELATED_LIMIT),
    getAppLegalDocs(app.id, locale),
  ])
  // Published documents win; the legacy external URL survives only without a privacy document.
  const privacyLink = resolvePrivacyLink(legalDocs, app.privacyPolicyUrl, app.slug, locale)
  const legacyPrivacyUrl = privacyLink?.external ? privacyLink.href : null
  const path = `/apps/${app.slug}`
  const url = localizedUrl(path, locale)

  const screenshots: ImageSource[] = (app.screenshots ?? [])
    .filter(isMedia)
    .map((m, i) =>
      toImageSource(m, format(dict.app.screenshotAlt, { name: app.name, index: i + 1 })),
    )
    .filter((s): s is ImageSource => s !== null)

  const iconImage = toImageSource(app.icon, format(dict.app.iconAlt, { name: app.name }))
  const installLabel = dict.app.getOnGooglePlay
  const sections = toDetailSections(app, (title) => `${title} — ${app.name}`)
  const phones = heroPhones(screenshots)
  const legalIndexHref =
    legalDocs.length > 0 ? localizeHref(legalIndexPath(app.slug), locale) : null

  return (
    <article data-accent={sections.accent ?? undefined}>
      <PayloadRedirects disableNotFound url={`/apps/${slug}`} />
      {draft && <LivePreviewListener />}
      <JsonLd
        data={[
          mobileApplicationSchema({
            name: app.name,
            description: app.shortDescription || app.tagline || undefined,
            url,
            image: iconImage ? absoluteUrl(iconImage.src) : undefined,
            screenshots: screenshots.map((s) => absoluteUrl(s.src)),
            category: category?.title || undefined,
            platforms: app.platforms,
            installUrl: app.playStoreUrl,
            locale,
            dateModified: app.updatedAt,
          }),
          breadcrumbSchema([
            { name: dict.nav.home, url: localizedUrl('/', locale) },
            { name: dict.listing.title, url: localizedUrl('/apps', locale) },
            { name: app.name, url },
          ]),
        ]}
      />

      <AppDetailHero
        backHref={localizeHref('/apps', locale)}
        backLabel={dict.detail.backToApps}
        breadcrumbLabel={dict.a11y.breadcrumb}
        breadcrumbs={[
          { label: dict.nav.home, href: localizeHref('/', locale) },
          { label: dict.listing.title, href: localizeHref('/apps', locale) },
          { label: app.name },
        ]}
        chipLabel={
          category?.title ? format(dict.detail.categoryApp, { category: category.title }) : null
        }
        icon={app.icon}
        installLabel={installLabel}
        name={app.name}
        phones={phones}
        playStoreUrl={app.playStoreUrl}
        tagline={app.tagline}
      />

      <AppHighlightStrip
        categoryTitle={category?.title ?? null}
        highlights={sections.highlights}
        icon={app.icon}
        name={app.name}
      />
      <HowItWorksSection
        data={sections.howItWorks}
        dict={dict}
        featuresHref={sections.features.length > 0 ? '#features' : null}
      />
      <KeyFeaturesSection dict={dict} features={sections.features} intro={sections.featuresIntro} />
      <DataControlBanner data={sections.dataControl} dict={dict} learnMoreHref={legalIndexHref} />

      {related.length > 0 && (
        <section
          aria-labelledby="related-title"
          className="site-container py-10 lg:py-[var(--section-y)]"
          data-section="related"
        >
          <div className="flex flex-col gap-6">
            <h2 id="related-title">
              <Eyebrow tone="accent">{dict.detail.moreApps}</Eyebrow>
            </h2>
            <ul className="flex flex-col gap-4">
              {related.map((r, i) => (
                <li className={i > 0 ? 'max-md:hidden' : undefined} key={r.id}>
                  <RelatedAppRow app={r} dict={dict} locale={locale} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <LegalLinksRow
        allDocsHref={legalIndexHref}
        dict={dict}
        docs={legalDocs.map((doc) => ({
          href: localizeHref(legalDocPath(app.slug, doc.slug), locale),
          title: doc.title,
          icon: doc.icon,
        }))}
        legacyPrivacyUrl={legacyPrivacyUrl}
        supportEmail={app.supportEmail ?? null}
      />

      {app.playStoreUrl && (
        <div className="sticky bottom-0 z-30 border-t border-border bg-nav-bg px-4 pb-5 pt-3 backdrop-blur-xl lg:hidden">
          <ButtonLink className="w-full" href={app.playStoreUrl}>
            {installLabel}
            <ArrowUpRight aria-hidden="true" className="size-[18px]" />
          </ButtonLink>
        </div>
      )}
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale, slug } = await resolve(params)
  const { isEnabled: draft } = await draftMode()
  const app = await getAppBySlug(slug, locale, draft)
  if (!app) {
    // Resolve the 404 here (before streaming starts) so crawlers get a real 404 status.
    // CMS redirects for old slugs are still honoured by <PayloadRedirects> in the page.
    const redirects = await getCachedRedirects()()
    if (!redirects.some((r) => r.from === `/apps/${slug}`)) notFound()
    return { robots: { index: false, follow: false } }
  }

  const dict = getDictionary(locale)
  const category = typeof app.category === 'object' ? app.category : null

  return generateMeta({
    doc: app,
    fallbackDescription: app.shortDescription || app.tagline || undefined,
    fallbackTitle: category ? `${app.name} — ${category.title}` : app.name,
    locale,
    noIndex: app.status === 'archived' || draft,
    path: `/apps/${app.slug}`,
    translated: true,
  }).then((meta) => ({
    ...meta,
    ...(app.packageId ? { other: { 'google-play-app': `app-id=${app.packageId}` } } : {}),
    description: meta.description ?? dict.meta.defaultDescription,
  }))
}
