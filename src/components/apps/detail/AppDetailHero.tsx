import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { Breadcrumbs, type Crumb } from '@/components/apps/Breadcrumbs'
import type { PhoneSlot } from '@/components/home/scrollStoryConfig'
import { AppIcon } from '@/components/site/AppIcon'
import { ButtonLink } from '@/components/site/ButtonLink'
import { GooglePlayMark } from '@/components/site/GooglePlayMark'
import type { ImageSource } from '@/components/site/media'
import { Chip } from '@/components/site/StatusChip'
import { cn } from '@/utilities/ui'

import { ACCENT_PILL_BUTTON } from './accentButton'
import { AppDetailPhones } from './AppDetailPhones'

type Props = {
  name: string
  tagline: string | null | undefined
  icon: unknown
  playStoreUrl: string | null | undefined
  /** Category chip text ("Finance app"); no chip without a category. */
  chipLabel: string | null
  breadcrumbs: Crumb[]
  breadcrumbLabel: string
  backHref: string
  backLabel: string
  installLabel: string
  phones: Array<{ slot: PhoneSlot; image: ImageSource }>
}

/**
 * Detail page header (design/app-detail.png): the accent motif behind it, breadcrumb, category
 * chip, app icon with the one `<h1>` and tagline, the pill-shaped Play Store button and, on
 * desktop, up to three phones.
 */
export const AppDetailHero: React.FC<Props> = ({
  name,
  tagline,
  icon,
  playStoreUrl,
  chipLabel,
  breadcrumbs,
  breadcrumbLabel,
  backHref,
  backLabel,
  installLabel,
  phones,
}) => (
  <header className="relative overflow-x-clip bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand-navy)_25%,transparent),transparent)]">
    <div
      aria-hidden="true"
      className="accent-motif-hero pointer-events-none absolute inset-0"
      data-motif="hero"
    />
    <div className="site-container relative pb-8 pt-6 lg:pb-16 lg:pt-12">
      <div
        className={cn(
          'flex flex-col gap-6 lg:gap-8',
          phones.length > 0 &&
            'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,40rem)] lg:items-center lg:gap-10',
        )}
      >
        <div className="flex min-w-0 flex-col gap-5 lg:gap-8">
          <div className="hidden lg:block">
            <Breadcrumbs items={breadcrumbs} label={breadcrumbLabel} />
          </div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary lg:hidden"
            href={backHref}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {backLabel}
          </Link>

          {chipLabel && (
            <span className="self-start" data-hero-chip>
              <Chip className="text-[11px] lg:text-xs" dotClassName="bg-app-accent-text">
                {chipLabel}
              </Chip>
            </span>
          )}

          <div className="flex items-center gap-4 lg:gap-8">
            <AppIcon className="lg:hidden" icon={icon} name={name} priority size={80} />
            <AppIcon
              className="hidden lg:inline-flex"
              icon={icon}
              name={name}
              priority
              size={120}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2 lg:gap-3">
              <h1 className="break-words font-display text-title font-semibold tracking-[-0.02em] text-foreground">
                {name}
              </h1>
              <p className="hidden break-words text-lg leading-snug text-text-secondary lg:block lg:text-xl">
                {tagline}
              </p>
            </div>
          </div>
          <p className="break-words text-[15px] leading-[1.55] text-text-secondary lg:hidden">
            {tagline}
          </p>

          {playStoreUrl && (
            <ButtonLink
              className={cn(ACCENT_PILL_BUTTON, 'hidden self-start lg:inline-flex')}
              href={playStoreUrl}
              size="lg"
              variant="ghost"
            >
              <GooglePlayMark className="size-5" />
              {installLabel}
              <ArrowUpRight aria-hidden="true" className="size-[18px] text-app-accent-text" />
            </ButtonLink>
          )}
        </div>

        <AppDetailPhones phones={phones} />
      </div>
    </div>
  </header>
)
