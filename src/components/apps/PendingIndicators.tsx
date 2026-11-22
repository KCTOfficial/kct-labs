'use client'

import { LoaderCircle } from 'lucide-react'
import { useLinkStatus } from 'next/link'
import React from 'react'
import { useFormStatus } from 'react-dom'

import { cn } from '@/utilities/ui'

/**
 * Inline "navigation in flight" feedback for the listing. `loading.tsx` does not show when only the
 * query string changes (same segment), so filters, sort, search and pagination would otherwise give
 * no sign of life until the new results arrive. Both indicators are absolutely positioned or swap
 * an existing icon → no layout shift. Reduced-motion users get the static state (global rule).
 */

/** Place inside a `relative` <Link>: a thin pulsing bar along the bottom edge while pending. */
export const LinkProgress: React.FC = () => {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-3 bottom-[3px] h-0.5 rounded-full bg-current transition-opacity duration-150',
        pending ? 'animate-pulse opacity-70' : 'opacity-0',
      )}
    />
  )
}

/** Place inside a <Form>: swaps the idle icon for a spinner while the form navigates. */
export const FormPendingIcon: React.FC<{ idle: React.ReactNode; className?: string }> = ({
  idle,
  className,
}) => {
  const { pending } = useFormStatus()
  return pending ? (
    <LoaderCircle aria-hidden="true" className={cn('animate-spin', className)} />
  ) : (
    idle
  )
}
