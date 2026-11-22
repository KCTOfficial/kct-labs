import { ArrowRight, Briefcase, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { AppCard } from '@/components/site/AppCard'
import { ButtonLink } from '@/components/site/ButtonLink'
import { Eyebrow } from '@/components/site/Eyebrow'
import { SearchForm } from '@/components/apps/SearchForm'
import { format, localizeHref, type Dictionary, type Locale } from '@/i18n'
import type { Home } from '@/payload-types'
import type { AppCard as AppCardData, CategoryWithCount } from '@/utilities/apps/queries'
import { cn } from '@/utilities/ui'

type Props = {
  catalog: Home['catalog']
  index: number
  apps: AppCardData[]
  totalApps: number
  categories: CategoryWithCount[]
  locale: Locale
  dict: Dictionary
}

const MOBILE_VISIBLE = 3

export const HomeCatalog: React.FC<Props> = ({
  catalog,
  index,
  apps,
  totalApps,
  categories,
  locale,
  dict,
}) => {
  const appsHref = localizeHref('/apps', locale)
  const service = catalog?.showServiceCard ? catalog.serviceCard : null
  const hasService = Boolean(service?.title)

  return (
    <section aria-labelledby="catalog-title" className="scroll-mt-20" id="apps">
      <div className="site-container flex flex-col gap-5 py-14 lg:gap-10 lg:py-28">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div
            className="reveal flex max-w-[620px] flex-col gap-3 lg:gap-4"
            data-story-part="heading"
          >
            {catalog?.eyebrow && <Eyebrow index={index}>{catalog.eyebrow}</Eyebrow>}
            <h2
              className="font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] text-foreground lg:text-[44px] lg:leading-[1.1]"
              id="catalog-title"
            >
              {catalog?.title || dict.listing.title}
            </h2>
            {catalog?.subtitle && (
              <p className="hidden text-[17px] leading-relaxed text-text-secondary lg:block">
                {catalog.subtitle}
              </p>
            )}
          </div>
          <SearchForm action={appsHref} className="hidden w-[300px] lg:flex" dict={dict} />
        </div>

        {categories.length > 0 && (
          <nav
            aria-label={dict.listing.categories}
            className="-mx-4 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:px-0"
          >
            <ul className="flex w-max items-center gap-2">
              <li>
                <Link
                  className="inline-flex rounded-full border border-primary bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground"
                  href={appsHref}
                >
                  {dict.listing.all} · {totalApps}
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    className="inline-flex rounded-full border border-border px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-foreground"
                    href={`${appsHref}?category=${encodeURIComponent(c.slug)}`}
                  >
                    {c.title} · {c.count}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {apps.map((app, i) => (
            <li
              className={cn('reveal', i >= MOBILE_VISIBLE && 'max-md:hidden')}
              data-story-part="card"
              key={app.id}
            >
              <AppCard app={app} dict={dict} locale={locale} />
            </li>
          ))}
          {hasService && service && (
            <li className="reveal max-md:hidden" data-story-part="card">
              <div className="flex h-full flex-col justify-between gap-4 rounded-lg border border-border-strong bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-navy)_35%,transparent),color-mix(in_srgb,var(--brand-sky)_8%,transparent))] p-6">
                <div className="flex flex-col gap-3">
                  <span className="flex size-14 items-center justify-center rounded-[16px] border border-primary">
                    <Briefcase aria-hidden="true" className="size-[26px] text-primary" />
                  </span>
                  {service.badge && (
                    <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-muted">
                      {service.badge}
                    </p>
                  )}
                  <h3 className="font-display text-[22px] font-semibold leading-tight text-foreground">
                    {service.title}
                  </h3>
                  {service.body && (
                    <p className="text-[15px] leading-[1.55] text-text-secondary">{service.body}</p>
                  )}
                </div>
                {service.ctaUrl && (
                  <ButtonLink className="w-full" href={localizeHref(service.ctaUrl, locale)}>
                    {service.ctaLabel || dict.nav.contactUs}
                    <ArrowRight aria-hidden="true" className="size-[18px]" />
                  </ButtonLink>
                )}
              </div>
            </li>
          )}
        </ul>

        {(totalApps > apps.length || apps.length > MOBILE_VISIBLE) && (
          <ButtonLink
            className={cn(
              'w-full',
              totalApps <= apps.length && 'md:hidden',
              'md:w-auto md:self-center',
            )}
            href={appsHref}
            variant="ghost"
          >
            <LayoutGrid aria-hidden="true" className="size-[18px]" />
            {format(dict.home.viewAll, { count: totalApps })}
          </ButtonLink>
        )}
      </div>
    </section>
  )
}
