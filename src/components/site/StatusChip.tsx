import React from 'react'

import type { App } from '@/payload-types'
import { cn } from '@/utilities/ui'

const dotColor: Record<App['status'], string> = {
  live: 'bg-accent-lime',
  new: 'bg-warning',
  beta: 'bg-accent-violet',
  archived: 'bg-text-muted',
}

/** Rounded mono chip with a status dot, e.g. `● LIVE`. */
export const Chip: React.FC<{
  children: React.ReactNode
  dotClassName?: string
  className?: string
}> = ({ children, dotClassName = 'bg-accent-lime', className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-2 rounded-full border border-border bg-primary-soft px-3 py-1.5',
      'font-mono text-xs font-medium uppercase tracking-[0.05em] text-text-secondary',
      className,
    )}
  >
    <span aria-hidden="true" className={cn('size-1.5 rounded-full', dotClassName)} />
    {children}
  </span>
)

export const StatusChip: React.FC<{ status: App['status']; label: string; className?: string }> = ({
  status,
  label,
  className,
}) => (
  <Chip className={className} dotClassName={dotColor[status] ?? dotColor.live}>
    {label}
  </Chip>
)
