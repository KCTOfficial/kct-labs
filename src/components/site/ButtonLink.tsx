import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

type Variant = 'primary' | 'ghost' | 'light' | 'outline-light'
type Size = 'md' | 'sm' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  ghost: 'border border-border-strong text-foreground hover:bg-surface-2',
  // Used on the always-navy CTA band, so it is intentionally theme-independent.
  light: 'bg-white text-brand-navy hover:bg-white/90',
  'outline-light': 'border border-white/40 text-white hover:bg-white/10',
}

const sizes: Record<Size, string> = {
  sm: 'h-11 px-4 text-sm',
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-[15px]',
}

export const buttonClassName = (
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string,
) =>
  cn(
    'inline-flex items-center justify-center gap-2.5 rounded-[12px] font-semibold whitespace-nowrap transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    variants[variant],
    sizes[size],
    className,
  )

const isExternal = (href: string) => /^https?:\/\//.test(href) || href.startsWith('mailto:')

/**
 * Link styled as a button. External links open in a new tab with `noopener noreferrer`.
 * Renders nothing when `href` is empty so optional CMS CTAs disappear cleanly.
 */
export const ButtonLink: React.FC<{
  href?: string | null
  children: React.ReactNode
  variant?: Variant
  size?: Size
  className?: string
  prefetch?: boolean
}> = ({ href, children, variant, size, className, prefetch }) => {
  if (!href) return null
  const classes = buttonClassName(variant, size, className)

  if (isExternal(href)) {
    return (
      <a className={classes} href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    )
  }

  return (
    <Link className={classes} href={href} prefetch={prefetch}>
      {children}
    </Link>
  )
}
