import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { format, localizeHref, type Dictionary, type Locale } from '@/i18n'
import type { AppCard as AppCardData } from '@/utilities/apps/queries'
import { parseDownloads } from '@/utilities/apps/validation'
import { cn } from '@/utilities/ui'

import { AppIcon } from './AppIcon'
import { StatusChip } from './StatusChip'

export const appHref = (slug: string, locale: Locale) => localizeHref(`/apps/${slug}`, locale)

export const downloadsText = (label: string | null | undefined, dict: Dictionary) =>
  parseDownloads(label) !== null && label
    ? format(dict.app.downloads, { count: label.trim() })
    : dict.app.justReleased

/**
 * App card (design: Components / AppCard). The whole card is clickable through the name link's
 * pseudo-element, which keeps a single, descriptive link per card for screen readers and crawlers.
 * `data-quick-view` lets QuickViewProvider open the popup on a plain click (only when opted in via
 * `QUICK_VIEW_CARDS`; otherwise the card goes straight to the full page); the link itself is a
 * normal, crawlable `<a href="/apps/<slug>">` (modifier clicks, no JS and failures just navigate).
 */
export const AppCard: React.FC<{
  app: AppCardData
  locale: Locale
  dict: Dictionary
  headingLevel?: 'h2' | 'h3'
  className?: string
}> = ({ app, locale, dict, headingLevel: Heading = 'h3', className }) => {
  const category = typeof app.category === 'object' ? app.category : null
  const hasDownloads = parseDownloads(app.downloadsLabel) !== null
  const status = app.status === 'live' && !hasDownloads ? 'new' : app.status

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col gap-[18px] rounded-lg border border-border bg-surface p-6',
        'transition-[border-color,transform,scale] duration-200 hover:-translate-y-0.5 hover:border-border-strong',
        'focus-within:border-primary',
        // The whole card is the link's pseudo-element: reflect press/keyboard focus on the card itself.
        'has-[a:active]:translate-y-0 has-[a:active]:scale-[0.99]',
        'has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-background',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <AppIcon icon={app.icon} name={app.name} size={56} />
        <StatusChip label={dict.app.status[status]} status={status} />
      </div>

      <Heading className="font-display text-[22px] font-semibold leading-tight text-foreground">
        <Link
          className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none"
          data-quick-view=""
          href={appHref(app.slug, locale)}
        >
          {app.name}
        </Link>
      </Heading>

      <p className="line-clamp-3 text-[15px] leading-[1.55] text-text-secondary">
        {app.shortDescription}
      </p>

      <div className="flex-1" />

      <div className="flex items-center justify-between gap-3">
        {category ? (
          <span className="truncate rounded-[6px] bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-secondary">
            {category.title}
          </span>
        ) : (
          <span />
        )}
        <span className="shrink-0 font-mono text-xs text-text-muted">
          {downloadsText(app.downloadsLabel, dict)}
        </span>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="flex items-center justify-between text-sm font-semibold text-primary">
        <span aria-hidden="true">{dict.app.viewDetails}</span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-[18px] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>
    </article>
  )
}
