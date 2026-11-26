import { ArrowRight, Store } from 'lucide-react'
import React from 'react'

import { ButtonLink } from '@/components/site/ButtonLink'
import { appHref } from '@/components/site/AppCard'
import { firstMedia, toImageSource } from '@/components/site/media'
import { Chip } from '@/components/site/StatusChip'
import { format, localizeHref, type Dictionary, type Locale } from '@/i18n'
import type { App, Home } from '@/payload-types'
import { cn } from '@/utilities/ui'

import { HeroStage, type HeroApp } from './HeroStage'

export type ShowcaseApp = Pick<App, 'id' | 'name' | 'slug' | 'shortDescription' | 'screenshots'>

type Props = {
  hero: Home['hero']
  showcase: ShowcaseApp[]
  stats: { totalApps: number; totalCategories: number; topDownloadsLabel: string | null }
  locale: Locale
  dict: Dictionary
}

const pad = (n: number) => String(n).padStart(2, '0')

export const HomeHero: React.FC<Props> = ({ hero, showcase, stats, locale, dict }) => {
  // The stage owns which app sits where (and rotates them); the first app starts in the centre.
  const apps: HeroApp[] = showcase.map((app) => ({
    id: app.id,
    name: app.name,
    href: appHref(app.slug, locale),
    shortDescription: app.shortDescription?.trim() || null,
    image: toImageSource(
      firstMedia(app.screenshots),
      format(dict.app.screenshotAlt, { name: app.name, index: 1 }),
    ),
  }))
  const statItems = [
    { value: pad(stats.totalApps), label: dict.home.statApps },
    { value: pad(stats.totalCategories), label: dict.home.statCategories },
    ...(stats.topDownloadsLabel
      ? [{ value: stats.topDownloadsLabel, label: dict.home.statTopDownloads }]
      : []),
  ].filter((s) => s.value !== '00')

  const hasPhones = apps.length > 0

  const section = (
    <section
      aria-labelledby="hero-title"
      className={cn('relative overflow-hidden', hasPhones && 'story-pin')}
      data-story="hero"
    >
      <div aria-hidden="true" className="bg-blueprint pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-0 size-[720px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent-orange)_18%,transparent),transparent_70%)]"
        data-story-part="hero-glow-a"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-48 top-[420px] h-[600px] w-[760px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-navy)_33%,transparent),transparent_70%)]"
        data-story-part="hero-glow-b"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent"
      />

      <div className="site-container relative grid gap-10 pb-0 pt-9 lg:grid-cols-[600px_1fr] lg:gap-10 lg:pt-[72px]">
        <div className="flex flex-col gap-5 lg:gap-7 lg:pt-14" data-story-part="hero-copy">
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

        {hasPhones && (
          <HeroStage
            apps={apps}
            key={apps.map((app) => app.id).join('.')}
            labels={{
              carousel: dict.home.heroCarousel,
              prev: dict.home.heroPrev,
              next: dict.home.heroNext,
              pause: dict.home.heroPause,
              play: dict.home.heroPlay,
            }}
          />
        )}
      </div>
    </section>
  )

  if (!hasPhones) return section

  // Scroll-story track: on desktop CSS makes the hero sticky while the spacer scrolls by
  // (server-rendered, so nothing shifts when the animation script loads).
  return (
    <div data-story-track="hero">
      {section}
      <div aria-hidden="true" className="story-spacer [--story-len:80vh]" />
    </div>
  )
}
