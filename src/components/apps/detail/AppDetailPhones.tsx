import Image from 'next/image'
import React from 'react'

import type { PhoneSlot } from '@/components/home/scrollStoryConfig'
import type { ImageSource } from '@/components/site/media'
import { PhoneFrame } from '@/components/site/PhoneFrame'
import { cn } from '@/utilities/ui'

// Static poses (percent of the group, so the whole composition scales with its width): left and
// right tilt away from the centre phone, which stands in front.
const POSE: Record<PhoneSlot, string> = {
  left: 'left-[2%] top-[9%] z-10 w-[37%] -rotate-6',
  center: 'left-[31.5%] top-0 z-20 w-[37%]',
  right: 'left-[61%] top-[11%] z-10 w-[37%] rotate-6',
}

/**
 * Up to three phones with the app's screenshots (desktop only: on phones the screenshot gallery
 * right below is the better use of the space, and the images are never requested there).
 * Decorative: the same screenshots are listed, with alt text, in the gallery.
 */
export const AppDetailPhones: React.FC<{
  phones: Array<{ slot: PhoneSlot; image: ImageSource }>
}> = ({ phones }) => {
  if (phones.length === 0) return null
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto hidden aspect-[700/600] w-[min(100%,40rem)] lg:block"
      data-hero-phones
    >
      {phones.map(({ slot, image }) => (
        <div className={cn('absolute', POSE[slot])} key={slot}>
          <PhoneFrame
            className="w-full"
            image={null}
            screen={
              <Image
                alt=""
                className="object-cover object-top"
                draggable={false}
                fetchPriority={slot === 'center' ? 'high' : undefined}
                fill
                sizes="230px"
                src={image.src}
              />
            }
            sizes="230px"
          />
        </div>
      ))}
    </div>
  )
}
