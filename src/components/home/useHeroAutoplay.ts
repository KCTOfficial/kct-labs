'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { HERO_AUTOPLAY_MS, isAutoplayRunning } from './heroCarouselModel'

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
  userPaused: boolean
  /** Mouse hover or keyboard focus inside the carousel. */
  interacting: boolean
  /** Changing it restarts the countdown (the active app changed). */
  resetKey: number
  onTick: () => void
}

/**
 * Autoplay countdown. One chained timeout (not an interval) that is re-armed whenever the app
 * changes or a stop condition flips, so a manual step always restarts a full countdown and a tab
 * that was hidden never replays missed ticks.
 */
export const useHeroAutoplay = ({
  rootRef,
  count,
  reducedMotion,
  userPaused,
  interacting,
  resetKey,
  onTick,
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
    userPaused,
    interacting,
    pageHidden,
    inView,
  })

  const onTickRef = useRef(onTick)
  useEffect(() => {
    onTickRef.current = onTick
  })

  useEffect(() => {
    if (!running) return
    const id = window.setTimeout(() => onTickRef.current(), HERO_AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [running, resetKey])

  return { running }
}
