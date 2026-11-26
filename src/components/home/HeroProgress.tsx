'use client'

import React from 'react'

import { cn } from '@/utilities/ui'

type Props = {
  count: number
  active: number
  /** `false` freezes the fill where it is (hover, keyboard focus, hidden tab, out of view). */
  running: boolean
  /** Accessible name per segment ("Show {app}"). */
  labels: string[]
  onSelect: (index: number) => void
  /** The active segment filled up: the autoplay step. */
  onComplete: () => void
}

/**
 * Autoplay indicator: one button per app. The active segment's fill is a CSS animation
 * (`.hero-progress-fill`, transform only) and is the only autoplay clock — no JS timer, no state per
 * frame. It remounts per active app (`key`), so every new app gets a full countdown.
 */
export const HeroProgress: React.FC<Props> = ({
  count,
  active,
  running,
  labels,
  onSelect,
  onComplete,
}) => {
  if (count < 2) return null

  return (
    <div className="hero-controls flex items-center" data-hero-progress role="group">
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === active
        return (
          <button
            aria-current={isActive ? 'true' : undefined}
            aria-label={labels[index]}
            className="group inline-flex h-11 min-w-6 items-center justify-center px-1 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            key={index}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span
              className={cn(
                'relative block h-1.5 overflow-hidden rounded-full bg-border-strong',
                isActive ? 'w-8' : 'w-1.5 group-hover:bg-text-muted',
              )}
            >
              {isActive && (
                <span
                  className="hero-progress-fill absolute inset-0 rounded-full bg-accent-orange"
                  data-running={running ? 'true' : 'false'}
                  data-testid="hero-progress-fill"
                  key={active}
                  onAnimationEnd={onComplete}
                />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
