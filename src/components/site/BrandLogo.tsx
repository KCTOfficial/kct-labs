import Image from 'next/image'
import React from 'react'

import { SITE_NAME } from '@/utilities/seo/constants'
import { cn } from '@/utilities/ui'

/** Intrinsic size of /public/brand/kct-hub-logo-*.png (trimmed wordmark). */
const LOGO_WIDTH = 700
const LOGO_HEIGHT = 128

type Props = {
  /** Rendered height in px; width follows the wordmark's aspect ratio. */
  height: number
  className?: string
}

/**
 * KCT Hub wordmark. Both theme variants are rendered and toggled with CSS (`.brand-logo-*` in
 * globals.css) so the correct one shows on first paint — including before the theme script runs
 * and without JS — with no hydration mismatch. The hidden variant is `display: none`, so it is
 * excluded from the accessibility tree and only the visible one provides the accessible name.
 */
export const BrandLogo: React.FC<Props> = ({ height, className }) => {
  const width = Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT)
  const shared = {
    height,
    width,
    // Above the fold on every page but never the LCP element: load eagerly without preloading.
    loading: 'eager' as const,
  }
  return (
    <>
      <Image
        {...shared}
        alt={SITE_NAME}
        className={cn('brand-logo-light h-auto', className)}
        src="/brand/kct-hub-logo-light.png"
      />
      <Image
        {...shared}
        alt={SITE_NAME}
        className={cn('brand-logo-dark h-auto', className)}
        src="/brand/kct-hub-logo-dark.png"
      />
    </>
  )
}
