'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import type { ImageSource } from '@/components/site/media'
import { format } from '@/i18n'
import type { Media } from '@/payload-types'
import { cn } from '@/utilities/ui'

import {
  HERO_SLIDE_MS,
  HERO_STAGGER_MS,
  stageSlots,
  stepActive,
  swipeDirection,
  type SlideDirection,
} from './heroCarouselModel'
import { HeroCaptionCard } from './HeroCaptionCard'
import { HeroPhone } from './HeroPhone'
import { HeroProgress } from './HeroProgress'
import type { PhoneSlot } from './scrollStoryConfig'
import { useHeroAutoplay, useReducedMotion } from './useHeroAutoplay'

/** Serializable app data for the stage; `href` is already localized and screen alts resolved. */
export type HeroApp = {
  id: number
  name: string
  href: string
  shortDescription: string | null
  /** Up to `HERO_MAX_SCREENS` populated screenshots. */
  screens: ImageSource[]
  icon: Pick<Media, 'url' | 'updatedAt' | 'width' | 'height' | 'alt'> | null
}

export type HeroLabels = {
  carousel: string
  prev: string
  next: string
  /** Segment label template with a `{name}` placeholder ("Show {name}"). */
  goTo: string
}

// Desktop stage positions follow the design (Hero / Device Stage, 700×748px): left, centre (front),
// right. Desktop offsets are % of the phone group so the whole pose scales with `--hero-stage-h`
// (top 140/40/150px of 748px).
const STAGE: Record<PhoneSlot, string> = {
  left: 'left-0 top-[60px] z-10 w-[44%] -rotate-3 lg:left-[4%] lg:top-[18.72%] lg:w-[37%] lg:-rotate-6',
  center:
    'left-1/2 top-0 z-20 w-[50%] -translate-x-1/2 lg:left-[31%] lg:top-[5.35%] lg:w-[37%] lg:translate-x-0',
  right:
    'right-0 top-[60px] z-10 w-[44%] rotate-3 lg:left-[59%] lg:right-auto lg:top-[20.05%] lg:w-[37%] lg:rotate-6',
}
/** Used only when no app has more than one phone, so the centre pose never jumps between apps. */
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
  const [hovered, setHovered] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  // Touch/pen users cannot hover and have no pause button: their first manual step stops autoplay
  // for the rest of this page view (WCAG 2.2.2). Mouse steps only restart the countdown.
  const [touchStopped, setTouchStopped] = useState(false)
  const reducedMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const animating = useRef(false)
  const touchStart = useRef<{ id: number; x: number; y: number } | null>(null)
  const swipedAt = useRef(Number.NEGATIVE_INFINITY)
  const commitTimer = useRef<number | undefined>(undefined)
  /** Pointer type of the latest press inside the carousel; cleared by a key press. */
  const lastPointerType = useRef<string | null>(null)

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

  /** Segment click: jump straight to that app (no chained slides); ignored mid-transition. */
  const select = useCallback(
    (index: number) => {
      if (animating.current || index === active) return
      setNeighborsReady(true)
      setChanged(true)
      setActive(index)
    },
    [active],
  )

  /** Called for manual steps only (buttons, segments, swipe), never for the autoplay step. */
  const stopIfTouch = useCallback(() => {
    const pointerType = lastPointerType.current
    if (pointerType && pointerType !== 'mouse') setTouchStopped(true)
  }, [])

  const { running } = useHeroAutoplay({
    rootRef,
    count,
    reducedMotion,
    interacting: hovered || keyboardFocus || touchStopped,
  })

  // Phones belong to the active app; they change (mount/unmount) only when a step commits.
  const slots = stageSlots(apps[active]!.screens.length)
  const singleLayout = apps.every((app) => stageSlots(app.screens.length).length === 1)
  // Caption and indicator already show the app arriving on stage while the screens slide, so its
  // fill (keyed by this index) starts a full countdown at once and can never end mid-slide.
  const shownIndex = slide ? stepActive(active, count, slide) : active
  const shown = apps[shownIndex]!

  return (
    <div
      aria-label={labels.carousel}
      aria-roledescription="carousel"
      className="relative mx-auto w-full max-w-[343px] lg:w-[max(var(--hero-phones-w),29rem)] lg:max-w-full lg:self-start"
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
      onKeyDownCapture={() => {
        lastPointerType.current = null
      }}
      onPointerDownCapture={(event) => {
        lastPointerType.current = event.pointerType
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
        className="relative h-[380px] touch-pan-y touch-pinch-zoom lg:h-[var(--hero-stage-h)]"
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
          stopIfTouch()
          go(direction)
        }}
      >
        {/* Phone group: the full stage on mobile; on desktop a box with the design's 700:748 ratio
            whose width follows the stage height (`--hero-phones-w`), centred above the caption and
            never wider than its column (tall but narrow desktops, e.g. a portrait tablet). */}
        <div className="absolute inset-0 lg:inset-auto lg:left-1/2 lg:top-0 lg:aspect-[700/748] lg:w-[min(var(--hero-phones-w),100%)] lg:-translate-x-1/2">
          {slots.map((slot) => (
            // Keyed by slot: the centre phone (and its loaded screens) survives a change of phone count.
            <div className={cn('absolute', singleLayout ? SINGLE : STAGE[slot])} key={slot}>
              <HeroPhone
                appIndex={active}
                apps={apps}
                neighborsReady={neighborsReady}
                slide={slide}
                slot={slot}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 lg:absolute lg:inset-x-0 lg:bottom-0 lg:z-30 lg:mx-auto lg:mt-0 lg:w-[min(100%,29rem)]">
        {/* Stable live region around the keyed caption: quiet while autoplay runs, polite after. */}
        <div aria-atomic="true" aria-live={running ? 'off' : 'polite'} className="w-full">
          <HeroCaptionCard animate={changed} app={shown} />
        </div>
        {count > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              aria-label={labels.prev}
              className={CONTROL_CLASS}
              onClick={() => {
                stopIfTouch()
                go('prev')
              }}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <HeroProgress
              active={shownIndex}
              count={count}
              labels={apps.map((app) => format(labels.goTo, { name: app.name }))}
              // Only a running fill may step: a stopped carousel never advances by itself.
              onComplete={() => {
                if (running) go('next')
              }}
              onSelect={(index) => {
                stopIfTouch()
                select(index)
              }}
              // Paused until hydrated: a fill that ended before React listened would never step.
              running={ready && running}
            />
            <button
              aria-label={labels.next}
              className={CONTROL_CLASS}
              onClick={() => {
                stopIfTouch()
                go('next')
              }}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
