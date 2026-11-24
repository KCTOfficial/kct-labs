import Image from 'next/image'
import React from 'react'

import { cn } from '@/utilities/ui'

import type { ImageSource } from './media'

/**
 * Device mockup (design: Components / Phone). Width is controlled by the caller through `className`;
 * the 9:18.7 aspect ratio keeps the frame proportional at every size.
 */
export const PhoneFrame: React.FC<{
  image: ImageSource | null
  className?: string
  priority?: boolean
  /**
   * Above-the-fold image that is NOT the LCP: load immediately but at low fetch priority.
   * `fetchPriority="low"` also stops React's SSR from auto-emitting a <link rel="preload"> for it.
   */
  eager?: boolean
  sizes: string
  /** Custom screen content (e.g. the hero carousel's sliding layers); replaces `image`. */
  screen?: React.ReactNode
}> = ({ image, className, priority, eager, sizes, screen }) => (
  <div
    className={cn(
      'aspect-[260/540] rounded-[38px] border border-border-strong bg-device p-2 shadow-[0_30px_60px_rgba(0,0,0,0.4)]',
      className,
    )}
  >
    <div className="relative size-full overflow-hidden rounded-[30px] bg-surface-2">
      {screen}
      {!screen && image && (
        <Image
          alt={image.alt}
          className="object-cover object-top"
          fetchPriority={!priority && eager ? 'low' : undefined}
          fill
          loading={priority ? undefined : eager ? 'eager' : undefined}
          priority={priority}
          sizes={sizes}
          src={image.src}
        />
      )}
    </div>
  </div>
)
