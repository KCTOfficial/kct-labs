import React from 'react'

import { SkeletonCard } from '@/components/apps/ListingStates'

export default function Loading() {
  return (
    <div aria-busy="true" className="site-container py-16 lg:py-24">
      <span className="sr-only" role="status">
        Loading…
      </span>
      <div className="mb-10 h-12 w-64 animate-pulse rounded-md bg-surface-2" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
