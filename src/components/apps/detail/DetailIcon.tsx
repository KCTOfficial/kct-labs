import React from 'react'

import { SiteIcon } from '@/components/site/SiteIcon'
import { isAppIconName } from '@/fields/appIcons'
import { cn } from '@/utilities/ui'

/**
 * Accent-coloured icon for the page sections. `name` comes from the CMS: unknown or empty values
 * render `fallback` instead (`data-icon` records what was drawn). `bare` draws just the glyph (as in
 * the design), otherwise it sits on a tinted tile. Server Components only.
 */
export const DetailIcon: React.FC<{
  name: string | null
  fallback: 'check' | 'sparkles'
  bare?: boolean
  className?: string
}> = ({ name, fallback, bare = false, className }) => {
  const icon = isAppIconName(name) ? name : fallback
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-app-accent-text',
        bare ? 'size-8' : 'size-10 rounded-[10px] bg-app-accent-soft',
        className,
      )}
      data-icon={icon}
    >
      <SiteIcon className={bare ? 'size-7' : 'size-5'} name={icon} strokeWidth={bare ? 1.75 : 2} />
    </span>
  )
}
