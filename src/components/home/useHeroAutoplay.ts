'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

import { isAutoplayRunning } from './heroCarouselModel'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
/** Share of the carousel that must be on screen for autoplay to keep running. */
const IN_VIEW_THRESHOLD = 0.25

const subscribeReducedMotion = (onChange: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

/** Live `prefers-reduced-motion: reduce` (false on the server and during hydration). */
export const useReducedMotion = (): boolean =>
  useSyncExternalStore(
    subscribeReducedMotion,
    () =>
      typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )

type Options = {
  rootRef: React.RefObject<HTMLElement | null>
  count: number
  reducedMotion: boolean
  /** Mouse hover or keyboard focus inside the carousel. */
  interacting: boolean
}

/**
 * Whether autoplay may run right now. There is no JS timer: the countdown is the CSS animation of
 * the active progress segment (`.hero-progress-fill`), which `running` pauses and resumes in place,
 * so a hidden tab or a hover never loses or replays time.
 */
export const useHeroAutoplay = ({
  rootRef,
  count,
  reducedMotion,
  interacting,
}: Options): { running: boolean } => {
  const pageHidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  )
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver !== 'function') return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: IN_VIEW_THRESHOLD },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [rootRef])

  const running = isAutoplayRunning({
    count,
    reducedMotion,
    interacting,
    pageHidden,
    inView,
  })

  return { running }
}
