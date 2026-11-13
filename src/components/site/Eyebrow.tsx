import React from 'react'

import { cn } from '@/utilities/ui'

/** Mono section label: `── 01 / OUR APPS`. */
export const Eyebrow: React.FC<{
  index?: number
  children: React.ReactNode
  className?: string
}> = ({ index, children, className }) => (
  <p
    className={cn(
      'flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.09em] text-primary',
      className,
    )}
  >
    <span aria-hidden="true" className="h-px w-6 bg-primary" />
    {index !== undefined && <span>{String(index).padStart(2, '0')} /</span>}
    <span>{children}</span>
  </p>
)
