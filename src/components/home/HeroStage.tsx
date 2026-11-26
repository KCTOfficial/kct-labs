'use client'

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import Link from 'next/link'
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import type { ImageSource } from '@/components/site/media'
import type { Media } from '@/payload-types'
import { cn } from '@/utilities/ui'

import {
  HERO_SLIDE_MS,
  HERO_STAGGER_MS,
  stageAppIndexes,
  stepActive,
  swipeDirection,
  type SlideDirection,
} from './heroCarouselModel'
import { HeroPhone } from './HeroPhone'
import { phoneSlot } from './scrollStoryConfig'
import { useHeroAutoplay, useReducedMotion } from './useHeroAutoplay'

/** Serializable app data for the stage; `href` is already localized and `image.alt` resolved. */
export type HeroApp = {
  id: number
  name: string
  href: string
  shortDescription: string | null
  /** First screen (kept until the stage renders `screens`). */
  image: ImageSource | null
  /** Up to `HERO_MAX_SCREENS` populated screenshots. */
  screens: ImageSource[]
  icon: Pick<Media, 'url' | 'updatedAt' | 'width' | 'height' | 'alt'> | null
}

export type HeroLabels = {
  carousel: string
  prev: string
  next: string
  pause: string
  play: string
}

// Desktop stage positions follow the design (Hero / Device Stage): left, centre (front), right.
const STAGE = [
  'left-0 top-[60px] z-10 w-[44%] -rotate-3 lg:left-[4%] lg:top-[140px] lg:w-[37%] lg:-rotate-6',
  'left-1/2 top-0 z-20 w-[50%] -translate-x-1/2 lg:left-[31%] lg:top-[40px] lg:w-[37%] lg:translate-x-0',
  'right-0 top-[60px] z-10 w-[44%] rotate-3 lg:left-[59%] lg:right-auto lg:top-[150px] lg:w-[37%] lg:rotate-6',
]
const SINGLE = 'left-1/2 top-0 w-[46%] -translate-x-1/2 lg:w-[37%]'

/** Neighbour screens load after the page's `load` event + idle, never during the LCP. */
const IDLE_TIMEOUT_MS = 1000
/** A click this soon after a swipe is the tail of the gesture, not a tap on a phone. */
const SWIPE_CLICK_GUARD_MS = 400
/** Safety margin so the committed step lands after the last phone's CSS transition ends. */
const COMMIT_BUFFER_MS = 50

const subscribeNever = () => () => {}

const CONTROL_CLASS =
  'hero-controls inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export const HeroStage: React.FC<{ apps: HeroApp[]; labels: HeroLabels }> = ({ apps, labels }) => {
  const count = apps.length
  const [active, setActive] = useState(0)
  const [slide, setSlide] = useState<SlideDirection | null>(null)
  const [neighborsReady, setNeighborsReady] = useState(false)
  // false on the server and during hydration, true once the client can drive the controls.
  const ready = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  const [changed, setChanged] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const reducedMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const animating = useRef(false)
  const touchStart = useRef<{ id: number; x: number; y: number } | null>(null)
  const swipedAt = useRef(Number.NEGATIVE_INFINITY)
  const commitTimer = useRef<number | undefined>(undefined)

  const warm = useCallback(() => setNeighborsReady(true), [])

  useEffect(() => {
    let idleId: number | undefined
    let timeoutId: number | undefined
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(warm, { timeout: IDLE_TIMEOUT_MS })
      } else {
        timeoutId = window.setTimeout(warm, IDLE_TIMEOUT_MS)
      }
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      window.removeEventListener('load', schedule)
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
      window.clearTimeout(timeoutId)
    }
  }, [warm])

  useEffect(() => () => window.clearTimeout(commitTimer.current), [])

  const go = useCallback(
    (direction: SlideDirection) => {
      // A click that lands mid-transition is ignored: transitions never stack or skip.
      if (animating.current || count < 2) return
      setNeighborsReady(true)
      setChanged(true)
      if (reducedMotion) {
        setActive((current) => stepActive(current, count, direction))
        return
      }
      animating.current = true
      setSlide(direction)
      commitTimer.current = window.setTimeout(
        () => {
          setActive((current) => stepActive(current, count, direction))
          setSlide(null)
          animating.current = false
        },
        HERO_SLIDE_MS + 2 * HERO_STAGGER_MS + COMMIT_BUFFER_MS,
      )
    },
    [count, reducedMotion],
  )

  const { running } = useHeroAutoplay({
    rootRef,
    count,
    reducedMotion,
    userPaused,
    interacting: hovered || keyboardFocus,
    resetKey: active,
    onTick: () => go('next'),
  })

  const stage = stageAppIndexes(active, count)
  // The caption already shows the app arriving in the centre while the screens slide.
  const shown = apps[slide ? stepActive(active, count, slide) : active]!

  return (
    <div
      aria-label={labels.carousel}
      aria-roledescription="carousel"
      className="relative mx-auto w-full max-w-[343px] lg:max-w-[700px]"
      data-active-index={active}
      data-animating={slide ? 'true' : 'false'}
      data-count={count}
      data-hero-carousel
      data-ready={ready ? 'true' : 'false'}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setKeyboardFocus(false)
        }
      }}
      onFocusCapture={(event) => {
        warm()
        // Only keyboard focus pauses autoplay: a mouse click leaves focus on the button too.
        if (event.target.matches(':focus-visible')) setKeyboardFocus(true)
      }}
      onPointerEnter={(event) => {
        warm()
        if (event.pointerType === 'mouse') setHovered(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setHovered(false)
      }}
      onTouchStart={warm}
      ref={rootRef}
      role="group"
    >
      <div
        aria-hidden="true"
        className="relative h-[380px] touch-pan-y touch-pinch-zoom lg:h-[748px]"
        onClickCapture={(event) => {
          // Swallow the click that can follow a swipe so it never opens an app page.
          if (performance.now() - swipedAt.current < SWIPE_CLICK_GUARD_MS) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        onPointerCancel={() => {
          touchStart.current = null
        }}
        onPointerDown={(event) => {
          // Mouse users have the buttons and the pointer-cursor links; swipe is for touch/pen.
          if (event.pointerType === 'mouse') return
          touchStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
        }}
        onPointerUp={(event) => {
          const start = touchStart.current
          touchStart.current = null
          if (!start || start.id !== event.pointerId) return
          const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y)
          if (!direction) return
          swipedAt.current = performance.now()
          go(direction)
        }}
      >
        {stage.map((appIndex, position) => (
          <div
            className={cn('absolute', stage.length === 1 ? SINGLE : STAGE[position])}
            key={position}
          >
            <HeroPhone
              appIndex={appIndex}
              apps={apps}
              neighborsReady={neighborsReady}
              slide={slide}
              slot={phoneSlot(stage.length, position)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3 lg:absolute lg:inset-x-0 lg:bottom-0 lg:z-30 lg:mx-auto lg:mt-0 lg:w-[66%]">
        {count > 1 && (
          <button
            aria-label={labels.prev}
            className={CONTROL_CLASS}
            onClick={() => go('prev')}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
        )}
        {/* Stable live region around the keyed caption: quiet while autoplay runs, polite after. */}
        <div
          aria-atomic="true"
          aria-live={running ? 'off' : 'polite'}
          className="h-[6.25rem] min-w-0 flex-1 text-center"
        >
          <div className={cn(changed && 'hero-caption-in')} data-hero-caption key={shown.id}>
            <Link
              className="block line-clamp-1 font-display text-base font-semibold text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              data-hero-caption-link
              href={shown.href}
            >
              {shown.name}
            </Link>
            {shown.shortDescription && (
              <p
                className="mt-1 line-clamp-3 text-sm leading-relaxed text-text-secondary"
                data-hero-caption-text
              >
                {shown.shortDescription}
              </p>
            )}
          </div>
        </div>
        {count > 1 && (
          <button
            aria-label={labels.next}
            className={CONTROL_CLASS}
            onClick={() => go('next')}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        )}
        {count > 1 && !reducedMotion && (
          <button
            aria-label={userPaused ? labels.play : labels.pause}
            className={CONTROL_CLASS}
            onClick={() => setUserPaused((paused) => !paused)}
            type="button"
          >
            {userPaused ? (
              <Play aria-hidden="true" className="size-4" />
            ) : (
              <Pause aria-hidden="true" className="size-4" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
