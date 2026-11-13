import type { Metadata } from 'next'
import { SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/apps/Breadcrumbs'
import { listingHref, parseListingParams } from '@/components/apps/listingParams'
import { ListingPagination } from '@/components/apps/ListingPagination'
import { EmptyState } from '@/components/apps/ListingStates'
import { SearchForm } from '@/components/apps/SearchForm'
import { SortSelect } from '@/components/apps/SortSelect'
import { AppCard, appHref } from '@/components/site/AppCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { format, getDictionary, isLocale, localizeHref, type Locale } from '@/i18n'
import { APPS_PAGE_SIZE, appSortOptions, getCatalogStats, listApps } from '@/utilities/apps/queries'
import { generateMeta } from '@/utilities/generateMeta'
import { breadcrumbSchema, itemListSchema } from '@/utilities/seo/structuredData'
import { absoluteUrl, localizedUrl } from '@/utilities/seo/urls'
import { cn } from '@/utilities/ui'

type SearchParams = Record<string, string | string[] | undefined>
type Args = { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }

const resolveLocale = async (params: Args['params']): Promise<Locale> => {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return locale
}

const chipClass = (active: boolean) =>
  cn(
    'inline-flex whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors',
    active
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border text-text-secondary hover:border-border-strong hover:text-foreground',
  )

export default async function AppsPage({ params, searchParams }: Args) {
  const locale = await resolveLocale(params)
  const dict = getDictionary(locale)
  const query = parseListingParams(await searchParams)
  const base = localizeHref('/apps', locale)

  const [stats, result] = await Promise.all([
    getCatalogStats(locale),
    listApps({ locale, q: query.q, category: query.category, sort: query.sort, page: query.page }),
  ])

  // Out-of-range page numbers are real 404s, not empty 200 pages.
  if (query.page > 1 && query.page > result.totalPages) notFound()

  const activeCategory = stats.categories.find((c) => c.slug === query.category)
  const from = result.totalDocs ? (result.page - 1) * result.limit + 1 : 0
  const to = Math.min(result.page * result.limit, result.totalDocs)
  const hidden = { q: query.q || undefined, category: query.category || undefined }
  const sortOptions = appSortOptions.map((value) => ({ value, label: dict.listing.sort[value] }))

  const categoryLinks = (
    <ul className="flex w-max items-center gap-2">
      <li>
        <Link
          className={chipClass(!query.category)}
          href={listingHref(base, { q: query.q, sort: query.sort })}
        >
          {dict.listing.all} · {stats.totalApps}
        </Link>
      </li>
      {stats.categories.map((c) => (
        <li key={c.id}>
          <Link
            aria-current={c.slug === query.category ? 'page' : undefined}
            className={chipClass(c.slug === query.category)}
            href={listingHref(base, { q: query.q, sort: query.sort, category: c.slug })}
          >
            {c.title} · {c.count}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: dict.nav.home, url: localizedUrl('/', locale) },
            { name: dict.listing.title, url: localizedUrl('/apps', locale) },
          ]),
          itemListSchema(
            result.docs.map((a) => ({ name: a.name, url: absoluteUrl(appHref(a.slug, locale)) })),
          ),
        ]}
      />

      <div className="border-b border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand-navy)_20%,transparent),transparent)]">
        <div className="site-container flex flex-col gap-3.5 pb-5 pt-7 lg:gap-5 lg:pb-10 lg:pt-16">
          <div className="hidden lg:block">
            <Breadcrumbs
              items={[
                { label: dict.nav.home, href: localizeHref('/', locale) },
                { label: dict.listing.title },
              ]}
              label={dict.a11y.breadcrumb}
            />
          </div>
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-foreground lg:text-[52px]">
            {activeCategory
              ? `${dict.listing.title} · ${activeCategory.title}`
              : dict.listing.title}
          </h1>
          <p className="max-w-[620px] text-[15px] leading-relaxed text-text-secondary lg:text-[17px]">
            {dict.listing.subtitle}
          </p>
          <SearchForm
            action={base}
            className="lg:hidden"
            defaultValue={query.q}
            dict={dict}
            hidden={hidden}
            id="apps-search-mobile"
          />
        </div>
      </div>

      <div className="site-container flex flex-col gap-4 pb-10 pt-1 lg:gap-7 lg:pb-24 lg:pt-10">
        {/* Desktop toolbar */}
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <p aria-live="polite" className="font-mono text-xs tracking-[0.05em] text-text-muted">
            {format(dict.listing.showing, { from, to, total: result.totalDocs })}
          </p>
          <div className="flex items-center gap-3">
            <SearchForm
              action={base}
              className="w-[260px]"
              defaultValue={query.q}
              dict={dict}
              hidden={{
                category: hidden.category,
                sort: query.sort !== 'featured' ? query.sort : undefined,
              }}
              id="apps-search"
            />
            <SortSelect
              action={base}
              applyLabel={dict.listing.apply}
              hidden={hidden}
              id="apps-sort"
              label={dict.listing.sortLabel}
              options={sortOptions}
              value={query.sort}
            />
          </div>
        </div>
        {stats.categories.length > 0 && (
          <nav
            aria-label={dict.listing.categories}
            className="hidden overflow-x-auto scrollbar-none lg:block"
          >
            {categoryLinks}
          </nav>
        )}

        {/* Mobile toolbar: count + disclosure with filters & sort (works without JS). */}
        <details className="group lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-xs uppercase tracking-[0.07em] text-text-muted">
              {format(dict.listing.countLabel, { count: result.totalDocs })}
            </span>
            <span className="inline-flex items-center gap-2 rounded-[10px] border border-border-strong px-3.5 py-2.5 text-sm font-medium text-foreground">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              {dict.listing.filterAndSort}
            </span>
          </summary>
          <div className="mt-4 flex flex-col gap-4 rounded-md border border-border bg-bg-raised p-4">
            <nav aria-label={dict.listing.categories} className="overflow-x-auto scrollbar-none">
              {categoryLinks}
            </nav>
            <SortSelect
              action={base}
              applyLabel={dict.listing.apply}
              hidden={hidden}
              id="apps-sort-mobile"
              label={dict.listing.sortLabel}
              options={sortOptions}
              value={query.sort}
            />
          </div>
        </details>

        {result.docs.length === 0 ? (
          <EmptyState dict={dict} resetHref={base} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {result.docs.map((app) => (
              <li key={app.id}>
                <AppCard app={app} dict={dict} headingLevel="h2" locale={locale} />
              </li>
            ))}
          </ul>
        )}

        <ListingPagination
          dict={dict}
          hrefFor={(page) => listingHref(base, { ...query, page })}
          page={result.page}
          totalPages={result.totalPages}
        />
      </div>
    </>
  )
}

export async function generateMetadata({ params, searchParams }: Args): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const dict = getDictionary(locale)
  const query = parseListingParams(await searchParams)
  const stats = await getCatalogStats(locale)
  const category = stats.categories.find((c) => c.slug === query.category)

  // Indexable variants: base list, real category pages and their pagination. Search results,
  // unknown categories and sort variants are noindex (or canonicalised) to avoid thin/duplicate pages.
  const path = listingHref('/apps', { category: category?.slug, page: query.page })
  const title = category ? `${category.title} · ${dict.listing.title}` : dict.listing.title
  const pageSuffix = query.page > 1 ? ` · ${format(dict.listing.page, { page: query.page })}` : ''
  // Derived from cached counts (no extra query). The page itself 404s; this covers streamed responses.
  const totalPages = Math.max(1, Math.ceil((category?.count ?? stats.totalApps) / APPS_PAGE_SIZE))
  const outOfRange = query.page > totalPages

  return generateMeta({
    doc: null,
    fallbackDescription: category
      ? format(dict.listing.categoryDescription, {
          category: category.title,
          count: category.count,
        })
      : dict.listing.subtitle,
    fallbackTitle: `${title}${pageSuffix}`,
    locale,
    noIndex: Boolean(query.q) || Boolean(query.category && !category) || outOfRange,
    path,
    translated: true,
  })
}
