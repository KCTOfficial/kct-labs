import React from 'react'

import { SkeletonCard } from '@/components/apps/ListingStates'
import { LoadingLabel } from '@/components/site/LoadingLabel'

/**
 * Listing skeleton (shown for /apps navigations that need a fresh render, e.g. filters, search,
 * pagination). Lives in the `(list)` route group on purpose: a loading.tsx above `[slug]` would
 * force streaming and turn real 404s into 200s.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="site-container py-10 lg:py-16">
      <LoadingLabel />
      <div aria-hidden="true" className="mb-8 flex flex-col gap-4 lg:mb-10">
        <div className="skeleton h-9 w-56 rounded-md lg:h-[52px] lg:w-80" />
        <div className="skeleton h-4 w-full max-w-[520px] rounded-md" />
        <div className="mt-2 flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="skeleton h-9 w-24 shrink-0 rounded-full" key={i} />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
