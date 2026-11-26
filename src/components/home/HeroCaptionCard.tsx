import Link from 'next/link'
import React from 'react'

import { AppIcon } from '@/components/site/AppIcon'
import { cn } from '@/utilities/ui'

import type { HeroApp } from './HeroStage'

/**
 * Caption of the app in the centre: icon | name + short description. The card has one fixed height
 * (name 1 line, description max 3 lines) so stepping between apps never shifts the layout. The
 * name link is the keyboard route to the app (the phone links are aria-hidden and not tabbable).
 */
export const HeroCaptionCard: React.FC<{ app: HeroApp; animate: boolean }> = ({ app, animate }) => (
  <div className="h-32 overflow-hidden rounded-2xl border border-border bg-surface">
    <div
      className={cn('flex h-full items-center gap-3 px-4', animate && 'hero-caption-in')}
      data-hero-caption
      key={app.id}
    >
      <AppIcon icon={app.icon} name={app.name} size={56} />
      <span aria-hidden="true" className="h-14 w-px shrink-0 bg-border" />
      <div className="min-w-0 flex-1 text-left">
        <Link
          className="line-clamp-1 font-display text-base font-semibold text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          data-hero-caption-link
          href={app.href}
        >
          {app.name}
        </Link>
        {app.shortDescription && (
          <p
            className="mt-1 line-clamp-3 text-sm leading-relaxed text-text-secondary"
            data-hero-caption-text
          >
            {app.shortDescription}
          </p>
        )}
      </div>
    </div>
  </div>
)
