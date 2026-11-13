import Image from 'next/image'
import React from 'react'

import { cn } from '@/utilities/ui'

import { toImageSource } from './media'

const SIZES = {
  40: 'size-10 rounded-[10px]',
  56: 'size-14 rounded-[15px]',
  64: 'size-16 rounded-[16px]',
  80: 'size-20 rounded-[20px]',
  120: 'size-[120px] rounded-[30px]',
} as const

export type AppIconSize = keyof typeof SIZES

/** Rounded app icon. Falls back to the app initial when the icon upload is missing. */
export const AppIcon: React.FC<{
  icon: unknown
  name: string
  size: AppIconSize
  className?: string
  priority?: boolean
}> = ({ icon, name, size, className, priority }) => {
  const image = toImageSource(icon, name)

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-surface-2',
        SIZES[size],
        className,
      )}
    >
      {image ? (
        <Image
          alt={image.alt}
          className="size-full object-cover"
          height={size}
          priority={priority}
          sizes={`${size}px`}
          src={image.src}
          width={size}
        />
      ) : (
        <span aria-hidden="true" className="font-display text-xl font-semibold text-primary">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  )
}
