import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { AppIcon } from '@/components/site/AppIcon'
import { appHref } from '@/components/site/AppCard'
import { Chip } from '@/components/site/StatusChip'
import type { Dictionary, Locale } from '@/i18n'
import type { AppCard } from '@/utilities/apps/queries'

/**
 * One related app as a wide row (design: icon, name, description, "View details", category chip and
 * a round arrow). Like the app card, the whole row is the name link's pseudo-element: one descriptive
 * link per row for screen readers and crawlers, and `data-quick-view` keeps the opt-in popup working
 * (modifier clicks, no JS and failures simply navigate).
 */
export const RelatedAppRow: React.FC<{ app: AppCard; locale: Locale; dict: Dictionary }> = ({
  app,
  locale,
  dict,
}) => {
  const category = typeof app.category === 'object' ? app.category : null
  return (
    <div className="group relative flex items-center gap-4 rounded-2xl border border-border bg-surface/80 p-4 transition-colors hover:border-border-strong has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring lg:gap-6 lg:p-6">
      <AppIcon icon={app.icon} name={app.name} size={64} />
      <div className="min-w-0 flex-1">
        <h3 className="break-words font-display text-xl font-semibold leading-tight text-foreground">
          <Link
            className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none"
            data-quick-view=""
            href={appHref(app.slug, locale)}
          >
            {app.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 break-words text-sm text-text-secondary">
          {app.shortDescription}
        </p>
        <span
          aria-hidden="true"
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-app-accent-text"
        >
          {dict.app.viewDetails}
          <ArrowRight className="size-4" />
        </span>
      </div>
      {category && (
        <Chip
          className="hidden max-w-[12rem] shrink-0 sm:inline-flex"
          dotClassName="bg-app-accent-text"
        >
          <span className="truncate">{category.title}</span>
        </Chip>
      )}
      <span
        aria-hidden="true"
        className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-foreground transition-transform group-hover:translate-x-0.5 sm:inline-flex"
      >
        <ArrowRight className="size-5" />
      </span>
    </div>
  )
}
