import Image from 'next/image'
import React from 'react'

import { cn } from '@/utilities/ui'

import type { ImageSource } from './media'

/**
 * Device mockup (design: Components / Phone). Width is controlled by the caller through `className`;
 * the 260:540 aspect ratio keeps the frame proportional at every size.
 *
 * Corner radius and bezel are percentages of the frame, not pixels: a fixed 38px radius / 8px bezel
 * (right at the design's 260px width) turns a 110px phone into a toy. Percent radii are elliptical
 * (horizontal share of the width, vertical share of the height); with the 260:540 ratio both axes
 * resolve to the same length, so corners stay circular. Values = the design's px ÷ 260 (width)
 * and ÷ 540 (height):
 * - outer radius 38px  → 14.6% / 7.04%
 * - bezel 8px          → 3.08% (sides) / 1.48% (top, bottom)
 * - screen radius 30px → 12.3% / 5.7%
 * The 1px border stays a hairline at any size.
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
  /** Small pill ("camera island") at the top of the screen, sized relative to the frame. */
  notch?: boolean
}> = ({ image, className, priority, eager, sizes, screen, notch }) => (
  <div
    className={cn(
      'relative aspect-[260/540] rounded-[14.6%/7.04%] border border-border-strong bg-device shadow-[0_30px_60px_rgba(0,0,0,0.4)]',
      className,
    )}
    data-phone-frame=""
  >
    <div
      className="absolute inset-x-[3.08%] inset-y-[1.48%] overflow-hidden rounded-[12.3%/5.7%] bg-surface-2"
      data-phone-screen=""
    >
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
    {notch && (
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-[2.6%] h-[2%] w-[27%] -translate-x-1/2 rounded-full bg-device"
        data-phone-notch=""
      />
    )}
  </div>
)
