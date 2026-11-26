import type { Metadata } from 'next'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/apps/Breadcrumbs'
import { ScreenshotGallery } from '@/components/apps/ScreenshotGallery'
import { ShareButton } from '@/components/apps/ShareButton'
import { LEGAL_ICON_COMPONENTS } from '@/components/legal/LegalDocNav'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import { JsonLd } from '@/components/seo/JsonLd'
import { AppCard } from '@/components/site/AppCard'
import { AppIcon } from '@/components/site/AppIcon'
import { ButtonLink } from '@/components/site/ButtonLink'
import { isMedia, toImageSource, type ImageSource } from '@/components/site/media'
import { StatusChip } from '@/components/site/StatusChip'
import { format, getDictionary, isLocale, localizeHref } from '@/i18n'
import type { App } from '@/payload-types'
import { getAppBySlug, getPublicAppSlugs, getRelatedApps } from '@/utilities/apps/queries'
import { parseDownloads } from '@/utilities/apps/validation'
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
  const hasLegal = legalDocs.length > 0 || legacyPrivacyUrl !== null
  const path = `/apps/${app.slug}`
  const url = localizedUrl(path, locale)
  const platforms = (app.platforms ?? ['android']).map((p) => dict.platforms[p] ?? p)
  const hasDownloads = parseDownloads(app.downloadsLabel) !== null
  const status: App['status'] = app.status === 'live' && !hasDownloads ? 'new' : app.status

  const screenshots: ImageSource[] = (app.screenshots ?? [])
    .filter(isMedia)
    .map((m, i) =>
      toImageSource(m, format(dict.app.screenshotAlt, { name: app.name, index: i + 1 })),
    )
    .filter((s): s is ImageSource => s !== null)

  const specs = [
    { label: dict.detail.category, value: category?.title },
    {
      label: dict.detail.downloads,
      value: hasDownloads ? app.downloadsLabel : dict.app.justReleased,
    },
    { label: dict.detail.ageRating, value: app.ageRating },
    { label: dict.detail.platform, value: platforms.join(' · ') },
    { label: dict.detail.developer, value: dict.detail.developerName },
  ].filter((s): s is { label: string; value: string } => Boolean(s.value))

  const infoRows = [
    { label: dict.detail.packageId, value: app.packageId, mono: true },
    ...(app.specs ?? []).map((s) => ({ label: s.label, value: s.value, mono: false })),
  ].filter((r) => r.value?.trim())

  const iconImage = toImageSource(app.icon, format(dict.app.iconAlt, { name: app.name }))
  const features = (app.features ?? []).filter((f) => f.label?.trim())
  const installLabel = dict.app.getOnGooglePlay

  return (
    <article>
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

      <header className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand-navy)_25%,transparent),transparent)]">
        <div className="site-container flex flex-col gap-4 pb-6 pt-6 lg:gap-8 lg:pb-14 lg:pt-12">
          <div className="hidden lg:block">
            <Breadcrumbs
              items={[
                { label: dict.nav.home, href: localizeHref('/', locale) },
                { label: dict.listing.title, href: localizeHref('/apps', locale) },
                { label: app.name },
              ]}
              label={dict.a11y.breadcrumb}
            />
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary lg:hidden"
            href={localizeHref('/apps', locale)}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {dict.detail.backToApps}
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
            <div className="flex items-center gap-4 lg:contents">
              <AppIcon className="lg:hidden" icon={app.icon} name={app.name} priority size={80} />
              <AppIcon
                className="hidden lg:inline-flex"
                icon={app.icon}
                name={app.name}
                priority
                size={120}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2 lg:gap-3">
                <StatusChip
                  className="self-start text-[11px] lg:text-xs"
                  label={`${dict.app.status[status]} · ${platforms.join(' · ').toUpperCase()}`}
                  status={status}
                />
                <h1 className="font-display text-title font-semibold tracking-[-0.02em] text-foreground">
                  {app.name}
                </h1>
                <p className="hidden text-lg text-text-secondary lg:block">{app.tagline}</p>
              </div>
            </div>
            <p className="text-[15px] leading-[1.55] text-text-secondary lg:hidden">
              {app.tagline}
            </p>
            <div className="hidden items-center gap-3 lg:flex">
              <ShareButton
                copiedLabel={dict.detail.linkCopied}
                label={dict.detail.share}
                title={app.name}
                url={url}
              />
              {app.playStoreUrl && (
                <ButtonLink href={app.playStoreUrl} size="lg">
                  {installLabel}
                  <ArrowUpRight aria-hidden="true" className="size-[18px]" />
                </ButtonLink>
              )}
            </div>
          </div>

          {specs.length > 0 && (
            <dl className="grid grid-cols-3 overflow-hidden rounded-md border border-border bg-bg-raised lg:grid-cols-5">
              {specs.map((s, i) => (
                <div
                  className={`flex flex-col gap-1 border-border px-3.5 py-3 lg:gap-1.5 lg:px-6 lg:py-[18px] ${i < specs.length - 1 ? 'border-r' : ''} ${i > 2 ? 'max-lg:hidden' : ''} ${i === 2 ? 'max-lg:border-r-0' : ''}`}
                  key={s.label}
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted lg:text-[11px]">
                    {s.label}
                  </dt>
                  <dd className="truncate text-[15px] font-semibold text-foreground lg:text-base">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </header>

      {screenshots.length > 0 && (
        <div className="site-container py-2 lg:py-14">
          <ScreenshotGallery
            images={screenshots}
            labels={{
              heading: format(dict.detail.screenshots, { count: screenshots.length }),
              hint: dict.detail.swipeHint,
              previous: dict.a11y.previousScreenshot,
              next: dict.a11y.nextScreenshot,
              close: dict.a11y.close,
            }}
          />
        </div>
      )}

      <div className="site-container grid gap-10 pb-8 pt-6 lg:grid-cols-[1fr_400px] lg:gap-16 lg:pb-20 lg:pt-6">
        <div className="flex flex-col gap-5 lg:gap-6">
          <h2 className="font-display text-[22px] font-semibold text-foreground lg:text-[28px]">
            {dict.detail.about}
          </h2>
          {app.description ? (
            <RichText
              className="prose-headings:font-display prose-headings:text-foreground prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-foreground prose-a:text-primary text-[15px] lg:text-[17px]"
              data={app.description}
              enableGutter={false}
            />
          ) : (
            <p className="text-[15px] leading-relaxed text-text-secondary lg:text-[17px]">
              {app.shortDescription}
            </p>
          )}
          {features.length > 0 && (
            <>
              <h3 className="font-display text-xl font-semibold text-foreground">
                {dict.detail.keyFeatures}
              </h3>
              <ul className="flex flex-col gap-3">
                {features.map((f) => (
                  <li
                    className="flex items-center gap-3 text-[15px] text-foreground lg:text-base"
                    key={f.id ?? f.label}
                  >
                    <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[6px] bg-accent-lime-soft lg:size-6 lg:rounded-[7px]">
                      <Check aria-hidden="true" className="size-3.5 text-accent-lime" />
                    </span>
                    {f.label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {(infoRows.length > 0 || hasLegal || app.supportEmail) && (
          <aside
            aria-labelledby="app-info-title"
            className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-7"
          >
            <h2
              className="font-mono text-xs uppercase tracking-[0.1em] text-primary"
              id="app-info-title"
            >
              {dict.detail.appInfo}
            </h2>
            {infoRows.length > 0 && (
              <dl className="flex flex-col">
                {infoRows.map((row) => (
                  <div
                    className="flex justify-between gap-4 border-b border-border py-3.5 first:pt-0"
                    key={row.label}
                  >
                    <dt className="text-sm text-text-muted">{row.label}</dt>
                    <dd
                      className={`break-all text-right text-sm text-foreground ${row.mono ? 'font-mono' : ''}`}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {hasLegal && (
              <div className="flex flex-col gap-2.5 pt-2" data-legal-links="">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">
                  {dict.legal.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {legalDocs.map((doc) => {
                    const Icon = LEGAL_ICON_COMPONENTS[doc.icon] ?? FileText
                    return (
                      <li key={doc.slug}>
                        <Link
                          className="inline-flex items-center gap-2.5 text-sm font-medium text-primary"
                          href={localizeHref(legalDocPath(app.slug, doc.slug), locale)}
                        >
                          <Icon aria-hidden="true" className="size-4 shrink-0" />
                          {doc.title}
                        </Link>
                      </li>
                    )
                  })}
                  {legacyPrivacyUrl && (
                    <li>
                      <a
                        className="inline-flex items-center gap-2.5 text-sm font-medium text-primary"
                        href={legacyPrivacyUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <ShieldCheck aria-hidden="true" className="size-4" />
                        {dict.detail.privacyPolicy}
                      </a>
                    </li>
                  )}
                  {legalDocs.length > 0 && (
                    <li>
                      <Link
                        className="inline-flex items-center gap-2.5 text-sm font-medium text-text-secondary hover:text-primary"
                        href={localizeHref(legalIndexPath(app.slug), locale)}
                      >
                        {dict.legal.allDocuments}
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {app.supportEmail && (
              <ul className="flex flex-col gap-2.5 pt-2">
                <li>
                  <a
                    className="inline-flex items-center gap-2.5 text-sm font-medium text-primary"
                    href={`mailto:${app.supportEmail}`}
                  >
                    <Mail aria-hidden="true" className="size-4" />
                    {dict.detail.contactSupport}
                  </a>
                </li>
              </ul>
            )}
          </aside>
        )}
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="border-t border-border bg-bg-raised">
          <div className="site-container flex flex-col gap-4 py-8 lg:gap-8 lg:py-20">
            <h2
              className="font-display text-[22px] font-semibold tracking-[-0.02em] text-foreground lg:text-[32px]"
              id="related-title"
            >
              {dict.detail.moreApps}
            </h2>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {related.map((r, i) => (
                <li className={i > 0 ? 'max-md:hidden' : undefined} key={r.id}>
                  <AppCard app={r} dict={dict} locale={locale} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

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
