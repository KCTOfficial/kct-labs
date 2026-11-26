import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/apps/Breadcrumbs'
import { LEGAL_ICON_COMPONENTS } from '@/components/legal/LegalDocNav'
import { JsonLd } from '@/components/seo/JsonLd'
import { AppIcon } from '@/components/site/AppIcon'
import { format, getDictionary, isLocale, localeTags, localizeHref, type Locale } from '@/i18n'
import type { App } from '@/payload-types'
import { getAppBySlug } from '@/utilities/apps/queries'
import { generateMeta } from '@/utilities/generateMeta'
import { legalFallbackDescription } from '@/utilities/legal/lexical'
import { legalDocPath, legalIndexPath } from '@/utilities/legal/paths'
import { getAppLegalDocs, type LegalDocLink } from '@/utilities/legal/queries'
import { breadcrumbSchema, itemListSchema } from '@/utilities/seo/structuredData'
import { localizedUrl } from '@/utilities/seo/urls'

/** Shorter intros are topped up with the app tagline (SEO: 120–160 chars). */
const DESCRIPTION_MIN_LENGTH = 120

type Args = { params: Promise<{ locale: string; slug: string }> }

const resolve = async (params: Args['params']) => {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  return { locale, slug: decodeURIComponent(slug) }
}

type Loaded = { app: App; docs: LegalDocLink[] }

/** An app without published legal documents has no index: a real 404, not an empty page. */
const load = async (slug: string, locale: Locale): Promise<Loaded | null> => {
  const { isEnabled: draft } = await draftMode()
  const app = await getAppBySlug(slug, locale, draft)
  if (!app) return null
  const docs = await getAppLegalDocs(app.id, locale)
  return docs.length > 0 ? { app, docs } : null
}

const formatDate = (value: string, locale: Locale) =>
  new Intl.DateTimeFormat(localeTags[locale], { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(value),
  )

export default async function LegalIndexPage({ params }: Args) {
  const { locale, slug } = await resolve(params)
  const loaded = await load(slug, locale)
  if (!loaded) notFound()

  const { app, docs } = loaded
  const dict = getDictionary(locale)
  const appHref = localizeHref(`/apps/${app.slug}`, locale)
  const indexPath = legalIndexPath(app.slug)

  const crumbs = [
    { name: dict.nav.home, url: localizedUrl('/', locale), href: localizeHref('/', locale) },
    {
      name: dict.listing.title,
      url: localizedUrl('/apps', locale),
      href: localizeHref('/apps', locale),
    },
    { name: app.name, url: localizedUrl(`/apps/${app.slug}`, locale), href: appHref },
    { name: dict.legal.title, url: localizedUrl(indexPath, locale), href: undefined },
  ]

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbSchema(crumbs.map(({ name, url }) => ({ name, url }))),
          itemListSchema(
            docs.map((d) => ({
              name: d.title,
              url: localizedUrl(legalDocPath(app.slug, d.slug), locale),
            })),
          ),
        ]}
      />

      <header className="border-b border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand-navy)_25%,transparent),transparent)]">
        <div className="site-container flex flex-col gap-4 pb-8 pt-6 lg:gap-6 lg:pb-12 lg:pt-12">
          <div className="hidden lg:block">
            <Breadcrumbs
              items={crumbs.map(({ name, href }) => ({ label: name, href }))}
              label={dict.a11y.breadcrumb}
            />
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary lg:hidden"
            href={appHref}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {format(dict.legal.backToApp, { name: app.name })}
          </Link>
          <Link
            className="inline-flex items-center gap-2.5 self-start rounded-full border border-border bg-surface py-1 pl-1 pr-4 text-sm font-medium text-foreground"
            href={appHref}
          >
            <AppIcon icon={app.icon} name={app.name} size={40} />
            {app.name}
          </Link>
          <h1 className="font-display text-title font-semibold tracking-[-0.02em] text-foreground">
            {format(dict.legal.indexTitle, { name: app.name })}
          </h1>
          <p className="max-w-2xl text-text-secondary">
            {format(dict.legal.indexIntro, { name: app.name })}
          </p>
        </div>
      </header>

      <div className="site-container pb-16 pt-8 lg:pb-24 lg:pt-12">
        <ul className="grid gap-4 md:grid-cols-2" data-legal-index>
          {docs.map((d) => {
            const Icon = LEGAL_ICON_COMPONENTS[d.icon]
            return (
              <li key={d.slug}>
                <Link
                  className="flex h-full items-start gap-4 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-primary hover:bg-surface-2"
                  href={localizeHref(legalDocPath(app.slug, d.slug), locale)}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-display text-lg font-semibold text-foreground">
                      {d.title}
                    </span>
                    {d.effectiveDate && (
                      <span className="text-sm text-text-muted">
                        {format(dict.legal.lastUpdated, {
                          date: formatDate(d.effectiveDate, locale),
                        })}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        {app.supportEmail && (
          <p className="mt-10 text-sm text-text-secondary">
            {dict.legal.contactQuestion}{' '}
            <a className="font-medium text-primary" href={`mailto:${app.supportEmail}`}>
              {app.supportEmail}
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale, slug } = await resolve(params)
  const loaded = await load(slug, locale)
  if (!loaded) notFound()

  const { isEnabled: draft } = await draftMode()
  const { app, docs } = loaded
  const dict = getDictionary(locale)

  return generateMeta({
    doc: null,
    fallbackDescription: legalFallbackDescription(
      format(dict.legal.indexIntro, { name: app.name }),
      app.tagline || app.shortDescription,
      DESCRIPTION_MIN_LENGTH,
    ),
    fallbackImage: app.meta?.image ?? app.icon,
    fallbackTitle: format(dict.legal.indexTitle, { name: app.name }),
    locale,
    noIndex: app.status === 'archived' || draft,
    path: legalIndexPath(app.slug),
    translated: docs.some((d) => d.hasIndonesian),
  }).then((meta) => ({
    ...meta,
    description: meta.description ?? dict.meta.defaultDescription,
  }))
}
