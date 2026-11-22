import { RotateCcw, SearchX } from 'lucide-react'
import React from 'react'

import { ButtonLink } from '@/components/site/ButtonLink'
import type { Dictionary } from '@/i18n'

export const EmptyState: React.FC<{ dict: Dictionary; resetHref: string }> = ({
  dict,
  resetHref,
}) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-border-strong bg-bg-raised px-6 py-16 text-center">
    <span className="flex size-16 items-center justify-center rounded-[18px] bg-primary-soft">
      <SearchX aria-hidden="true" className="size-7 text-primary" />
    </span>
    <h2 className="font-display text-[22px] font-semibold text-foreground">
      {dict.listing.emptyTitle}
    </h2>
    <p className="max-w-md text-[15px] text-text-secondary">{dict.listing.emptyBody}</p>
    <ButtonLink href={resetHref} variant="ghost">
      <RotateCcw aria-hidden="true" className="size-[18px]" />
      {dict.listing.reset}
    </ButtonLink>
  </div>
)

/**
 * Placeholder with the same structure, padding and gaps as `AppCard` (icon row, name, 3 text
 * lines, footer row, divider, link row) so swapping it for real content causes no layout shift.
 */
export const SkeletonCard: React.FC = () => (
  <div
    aria-hidden="true"
    className="flex h-full flex-col gap-[18px] rounded-lg border border-border bg-surface p-6"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="skeleton size-14 rounded-[15px]" />
      <div className="skeleton h-[30px] w-[72px] rounded-full" />
    </div>
    <div className="skeleton h-7 w-2/3 rounded-md" />
    <div className="flex flex-col gap-[9px]">
      <div className="skeleton h-3.5 w-full rounded-md" />
      <div className="skeleton h-3.5 w-full rounded-md" />
      <div className="skeleton h-3.5 w-3/5 rounded-md" />
    </div>
    <div className="flex-1" />
    <div className="flex items-center justify-between gap-3">
      <div className="skeleton h-6 w-24 rounded-[6px]" />
      <div className="skeleton h-3.5 w-20 rounded-md" />
    </div>
    <div className="h-px w-full bg-border" />
    <div className="skeleton h-5 w-28 rounded-md" />
  </div>
)
