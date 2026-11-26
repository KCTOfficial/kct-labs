'use client'

import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useParams } from 'next/navigation'
import React from 'react'

import { defaultLocale, getDictionary, isLocale } from '@/i18n'

/** Error boundary for /apps and /apps/[slug]. Never renders error details to visitors. */
export default function AppsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams<{ locale: string }>()
  const dict = getDictionary(isLocale(params?.locale) ? params.locale : defaultLocale)

  return (
    <div className="site-container py-16 lg:py-24">
      <div
        className="flex flex-col gap-4 rounded-md border border-destructive bg-destructive/10 p-5 sm:flex-row sm:items-center"
        role="alert"
      >
        <TriangleAlert aria-hidden="true" className="size-[22px] shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-foreground">{dict.listing.errorTitle}</p>
          <p className="text-sm text-text-secondary">{dict.listing.errorBody}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 self-start rounded-[12px] border border-border-strong px-4 py-2.5 text-sm font-semibold text-foreground sm:self-auto"
          onClick={() => reset()}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {dict.listing.retry}
        </button>
      </div>
    </div>
  )
}
