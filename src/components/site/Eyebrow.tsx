import React from 'react'

import { cn } from '@/utilities/ui'

/** Mono section label: `── 01 / OUR APPS`. */
export const Eyebrow: React.FC<{
  index?: number
  children: React.ReactNode
  className?: string
  /** `accent` uses the app accent colour (detail page); default is the brand primary. */
  tone?: 'primary' | 'accent'
}> = ({ index, children, className, tone = 'primary' }) => (
  <p
    className={cn(
      'flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.09em]',
      tone === 'accent' ? 'text-app-accent-text' : 'text-primary',
      className,
    )}
  >
    <span
      aria-hidden="true"
      className={cn('h-px w-6', tone === 'accent' ? 'bg-app-accent-text' : 'bg-primary')}
    />
    {index !== undefined && <span>{String(index).padStart(2, '0')} /</span>}
    <span>{children}</span>
  </p>
)
