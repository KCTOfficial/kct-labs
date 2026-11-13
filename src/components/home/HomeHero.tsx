import { ArrowRight, Store } from 'lucide-react'
import React from 'react'

import { ButtonLink } from '@/components/site/ButtonLink'
import { firstMedia, toImageSource } from '@/components/site/media'
import { PhoneFrame } from '@/components/site/PhoneFrame'
import { Chip } from '@/components/site/StatusChip'
import { format, localizeHref, type Dictionary, type Locale } from '@/i18n'
import type { App, Home } from '@/payload-types'
import { cn } from '@/utilities/ui'

export type ShowcaseApp = Pick<App, 'id' | 'name' | 'screenshots'>

type Props = {
  hero: Home['hero']
  showcase: ShowcaseApp[]
  stats: { totalApps: number; totalCategories: number; topDownloadsLabel: string | null }
  locale: Locale
  dict: Dictionary
}

const pad = (n: number) => String(n).padStart(2, '0')

// Desktop stage positions follow the design (Hero / Device Stage): left, centre (front), right.
const STAGE = [
  'left-0 top-[60px] z-10 w-[44%] -rotate-3 lg:left-[4%] lg:top-[140px] lg:w-[37%] lg:-rotate-6',
  'left-1/2 top-0 z-20 w-[50%] -translate-x-1/2 lg:left-[31%] lg:top-[40px] lg:w-[37%] lg:translate-x-0',
  'right-0 top-[60px] z-10 w-[44%] rotate-3 lg:left-[59%] lg:right-auto lg:top-[150px] lg:w-[37%] lg:rotate-6',
]
const ORDER = [1, 0, 2] // show the first app in the centre

export const HomeHero: React.FC<Props> = ({ hero, showcase, stats, locale, dict }) => {
  const phones = ORDER.map((i) => showcase[i]).filter(Boolean)
  const statItems = [
    { value: pad(stats.totalApps), label: dict.home.statApps },
    { value: pad(stats.totalCategories), label: dict.home.statCategories },
    ...(stats.topDownloadsLabel
      ? [{ value: stats.topDownloadsLabel, label: dict.home.statTopDownloads }]
      : []),
  ].filter((s) => s.value !== '00')

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-0 size-[720px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-sky)_25%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-48 top-[420px] h-[600px] w-[760px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-navy)_33%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent"
      />

      <div className="site-container relative grid gap-10 pb-0 pt-9 lg:grid-cols-[600px_1fr] lg:gap-10 lg:pt-[72px]">
        <div className="flex flex-col gap-5 lg:gap-7 lg:pt-14">
          {hero?.badge && <Chip className="self-start text-[11px] lg:text-xs">{hero.badge}</Chip>}
          <h1
            className="font-display text-[38px] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground lg:text-[64px] lg:leading-[1.05] lg:tracking-[-0.023em]"
            id="hero-title"
          >
            {hero?.headline}
          </h1>
          {hero?.subheadline && (
            <p className="max-w-[520px] text-base leading-relaxed text-text-secondary lg:text-lg">
              {hero.subheadline}
            </p>
          )}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3.5">
            <ButtonLink
              className="w-full sm:w-auto"
              href={
                hero?.primaryCtaUrl
                  ? localizeHref(hero.primaryCtaUrl, locale)
                  : localizeHref('/apps', locale)
              }
            >
              {hero?.primaryCtaLabel || dict.nav.apps}
              <ArrowRight aria-hidden="true" className="size-[18px]" />
            </ButtonLink>
            {hero?.secondaryCtaUrl && (
              <ButtonLink
                className="w-full sm:w-auto"
                href={localizeHref(hero.secondaryCtaUrl, locale)}
                variant="ghost"
              >
                <Store aria-hidden="true" className="size-[18px]" />
                {hero.secondaryCtaLabel || dict.app.viewOnGooglePlay}
              </ButtonLink>
            )}
          </div>
          {statItems.length > 0 && (
            <dl className="flex justify-between gap-6 pt-2 sm:justify-start sm:gap-10 lg:pt-6">
              {statItems.map((stat) => (
                <div className="flex flex-col-reverse gap-1" key={stat.label}>
                  <dt className="text-xs text-text-muted lg:text-[13px]">{stat.label}</dt>
                  <dd className="font-mono text-2xl font-semibold text-primary lg:text-[30px]">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {phones.length > 0 && (
          <div
            aria-hidden="true"
            className="relative mx-auto h-[380px] w-full max-w-[343px] lg:h-[748px] lg:max-w-[700px]"
          >
            {phones.map((app, i) => {
              const image = toImageSource(
                firstMedia(app.screenshots),
                format(dict.app.screenshotAlt, { name: app.name, index: 1 }),
              )
              return (
                <PhoneFrame
                  className={cn(
                    'absolute',
                    phones.length === 1
                      ? 'left-1/2 top-0 w-[46%] -translate-x-1/2 lg:w-[37%]'
                      : STAGE[i],
                    'max-lg:rounded-[26px] max-lg:p-1.5 [&>div]:max-lg:rounded-[20px]',
                  )}
                  image={image}
                  key={app.id}
                  // Only the centre phone is preloaded (high priority); the side phones load eagerly
                  // without a preload so they don't compete with the CSS and the <h1> (mobile LCP).
                  eager
                  priority={phones.length === 1 || i === 1}
                  sizes="(min-width: 1024px) 260px, 170px"
                />
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
