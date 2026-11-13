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

export const SkeletonCard: React.FC = () => (
  <div
    aria-hidden="true"
    className="flex h-[340px] flex-col gap-[18px] rounded-lg border border-border bg-surface p-6"
  >
    <div className="size-14 animate-pulse rounded-[16px] bg-surface-2" />
    <div className="h-3.5 w-[180px] animate-pulse rounded-md bg-surface-2" />
    <div className="h-3.5 w-full animate-pulse rounded-md bg-surface-2" />
    <div className="h-3.5 w-[240px] animate-pulse rounded-md bg-surface-2" />
  </div>
)
