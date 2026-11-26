import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/apps/Breadcrumbs'
import { LegalArticle } from '@/components/legal/LegalArticle'
import { LegalDocNav } from '@/components/legal/LegalDocNav'
import { LegalFallbackNotice } from '@/components/legal/LegalFallbackNotice'
import { LegalToc } from '@/components/legal/LegalToc'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { JsonLd } from '@/components/seo/JsonLd'
import { AppIcon } from '@/components/site/AppIcon'
import {
  defaultLocale,
  format,
  getDictionary,
  isLocale,
  localeLabels,
  localeTags,
  localizeHref,
  locales,
  type Locale,
} from '@/i18n'
import type { App } from '@/payload-types'
import { getAppBySlug } from '@/utilities/apps/queries'
import { generateMeta } from '@/utilities/generateMeta'
import { getCachedRedirects } from '@/utilities/getRedirects'
import { extractToc, firstParagraphText, legalFallbackDescription } from '@/utilities/legal/lexical'
import { legalDocPath, legalIndexPath } from '@/utilities/legal/paths'
import {
  getAppLegalDoc,
  getAppLegalDocs,
  getPublicLegalDocPaths,
  type AppLegalDoc,
} from '@/utilities/legal/queries'
import { breadcrumbSchema, webPageSchema } from '@/utilities/seo/structuredData'
import { localizedUrl } from '@/utilities/seo/urls'

/** Shorter first paragraphs are topped up with the app tagline (SEO: 120–160 chars). */
const DESCRIPTION_MIN_LENGTH = 120

type Args = { params: Promise<{ locale: string; slug: string; doc: string }> }

export async function generateStaticParams() {
  const paths = await getPublicLegalDocPaths()
  return paths.map(({ appSlug, docSlug }) => ({ slug: appSlug, doc: docSlug }))
}

const resolve = async (params: Args['params']) => {
  const { locale, slug, doc } = await params
  if (!isLocale(locale)) notFound()
  return { locale, slug: decodeURIComponent(slug), docSlug: decodeURIComponent(doc) }
}

type Loaded = { app: App; doc: AppLegalDoc }

const load = async (slug: string, docSlug: string, locale: Locale): Promise<Loaded | null> => {
  const { isEnabled: draft } = await draftMode()
  const app = await getAppBySlug(slug, locale, draft)
  if (!app) return null
  const doc = await getAppLegalDoc(app.id, docSlug, locale, draft)
  return doc ? { app, doc } : null
}

/** On `/id` without Indonesian content the English version is shown (Payload locale fallback). */
const isFallback = (doc: AppLegalDoc, locale: Locale) =>
  locale !== defaultLocale && !doc.hasIndonesian

const docTitle = (doc: AppLegalDoc) => doc.title || doc.slug

const formatDate = (value: string, locale: Locale) =>
  new Intl.DateTimeFormat(localeTags[locale], { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(value),
  )

export default async function LegalDocPage({ params }: Args) {
  const { locale, slug, docSlug } = await resolve(params)
  const path = legalDocPath(slug, docSlug)
  const loaded = await load(slug, docSlug, locale)
  if (!loaded) return <PayloadRedirects url={path} />

  const { isEnabled: draft } = await draftMode()
  const { app, doc } = loaded
  const dict = getDictionary(locale)
  const fallback = isFallback(doc, locale)
  const title = docTitle(doc)
  const content = doc.content as unknown as DefaultTypedEditorState | null
  const toc = content ? extractToc(content as unknown as SerializedEditorState) : []
  const docs = await getAppLegalDocs(app.id, locale)
  const updated = doc.effectiveDate ?? doc.updatedAt
  // A doc without Indonesian content has one canonical (EN), as in its metadata.
  const url = localizedUrl(path, fallback ? defaultLocale : locale)
  const appHref = localizeHref(`/apps/${app.slug}`, locale)
  const otherLocales = doc.hasIndonesian ? locales.filter((l) => l !== locale) : []

  const crumbs = [
    { name: dict.nav.home, url: localizedUrl('/', locale), href: localizeHref('/', locale) },
    {
      name: dict.listing.title,
      url: localizedUrl('/apps', locale),
      href: localizeHref('/apps', locale),
    },
    { name: app.name, url: localizedUrl(`/apps/${app.slug}`, locale), href: appHref },
    {
      name: dict.legal.title,
      url: localizedUrl(legalIndexPath(app.slug), locale),
      href: localizeHref(legalIndexPath(app.slug), locale),
    },
    { name: title, url, href: undefined },
  ]

  return (
    <div>
      <PayloadRedirects disableNotFound url={path} />
      {draft && <LivePreviewListener />}
      <JsonLd
        data={[
          webPageSchema({
            name: title,
            url,
            dateModified: doc.updatedAt,
            inLanguage: fallback ? defaultLocale : locale,
          }),
          breadcrumbSchema(crumbs.map(({ name, url: itemUrl }) => ({ name, url: itemUrl }))),
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
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
            <p>
              <time dateTime={updated}>
                {format(dict.legal.lastUpdated, { date: formatDate(updated, locale) })}
              </time>
            </p>
            {otherLocales.map((l) => (
              <Link
                className="font-medium text-primary"
                href={localizeHref(path, l)}
                hrefLang={localeTags[l]}
                key={l}
                lang={localeTags[l]}
              >
                {format(dict.legal.alsoIn, { language: localeLabels[l] })}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="site-container grid gap-10 pb-16 pt-8 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:gap-12 lg:pb-24 lg:pt-12">
        <div className="max-lg:order-last max-lg:border-t max-lg:border-border max-lg:pt-8">
          <div className="lg:sticky lg:top-28">
            <LegalDocNav
              allHref={localizeHref(legalIndexPath(app.slug), locale)}
              allLabel={dict.legal.allDocuments}
              items={docs.map((d) => ({
                href: localizeHref(legalDocPath(app.slug, d.slug), locale),
                title: d.title,
                icon: d.icon,
                isCurrent: d.slug === doc.slug,
              }))}
              label={dict.legal.otherDocs}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {fallback && <LegalFallbackNotice message={dict.legal.fallbackNotice} />}
          {content && (
            <LegalArticle
              content={content}
              lang={fallback ? localeTags[defaultLocale] : undefined}
              toc={toc}
            >
              {app.supportEmail && (
                <p className="mt-10 border-t border-border pt-6 text-sm text-text-secondary">
                  {dict.legal.contactQuestion}{' '}
                  <a className="font-medium text-primary" href={`mailto:${app.supportEmail}`}>
                    {app.supportEmail}
                  </a>
                </p>
              )}
            </LegalArticle>
          )}
        </div>

        {toc.length > 0 && (
          <aside className="max-lg:hidden">
            <div className="sticky top-28">
              <LegalToc items={toc} label={dict.legal.onThisPage} />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale, slug, docSlug } = await resolve(params)
  const path = legalDocPath(slug, docSlug)
  const loaded = await load(slug, docSlug, locale)
  if (!loaded) {
    // Resolve the 404 before streaming starts so crawlers get a real status; CMS redirects for
    // old paths are still honoured by <PayloadRedirects> in the page.
    const redirects = await getCachedRedirects()()
    if (!redirects.some((r) => r.from === path)) notFound()
    return { robots: { index: false, follow: false } }
  }

  const { isEnabled: draft } = await draftMode()
  const { app, doc } = loaded
  const dict = getDictionary(locale)

  return generateMeta({
    // Only the SEO group: the document title alone would drop the app name from <title>.
    doc: { meta: doc.meta },
    fallbackDescription: legalFallbackDescription(
      firstParagraphText(doc.content),
      app.tagline || app.shortDescription,
      DESCRIPTION_MIN_LENGTH,
    ),
    fallbackImage: app.meta?.image ?? app.icon,
    fallbackTitle: `${docTitle(doc)} – ${app.name}`,
    locale,
    noIndex: app.status === 'archived' || draft,
    ogType: 'article',
    path: legalDocPath(app.slug, doc.slug),
    translated: doc.hasIndonesian,
  }).then((meta) => ({
    ...meta,
    description: meta.description ?? dict.meta.defaultDescription,
  }))
}
