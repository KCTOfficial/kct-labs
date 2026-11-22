'use client'

import { useEffect } from 'react'

import { PIN_QUERY, STORY_QUERY } from './scrollStoryConfig'

/** Load GSAP when the browser is idle, or right away on the first sign of interaction. */
const IDLE_TIMEOUT_MS = 1000
const INPUT_EVENTS = ['scroll', 'wheel', 'keydown', 'pointerdown', 'touchstart'] as const
const FALLBACK_HEADER_HEIGHT = 79

const headerOffset = () =>
  document.querySelector('header')?.getBoundingClientRect().height ?? FALLBACK_HEADER_HEIGHT

/**
 * Scroll-scrubbed home "story" (desktop only). Renders nothing: it enhances server-rendered markup
 * marked with `data-story`/`data-story-part` (see scrollStory.ts). Mobile, tablets, reduced motion
 * and no-JS never download GSAP and keep the CSS `.reveal` version.
 *
 * Lifetime = mount/unmount of the home page only. Deliberately NOT tied to `usePathname`: the
 * quick-view popup pushes `/apps/<slug>` while the home page stays mounted underneath.
 * `layoutKey` changes (sections toggled in the CMS, different showcase apps) rebuild everything.
 */
export const HomeScrollStory: React.FC<{ layoutKey: string }> = ({ layoutKey }) => {
  useEffect(() => {
    const root = document.getElementById('main-content')
    if (!root || typeof window.matchMedia !== 'function') return

    const html = document.documentElement
    const desktop = window.matchMedia(STORY_QUERY)
    let cancelled = false
    let started = false
    let revert: (() => void) | undefined
    let idleId: number | undefined
    let timeoutId: number | undefined

    const clearSchedule = () => {
      INPUT_EVENTS.forEach((type) => window.removeEventListener(type, start))
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
      window.clearTimeout(timeoutId)
    }

    const load = async () => {
      try {
        // Builders load with GSAP: mobile/tablet never download any of the animation code.
        const [{ gsap }, { ScrollTrigger }, { buildHomeStory }] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
          import('./scrollStory'),
        ])
        if (cancelled) return
        gsap.registerPlugin(ScrollTrigger)

        // gsap.matchMedia reverts and rebuilds on breakpoint / reduced-motion changes by itself.
        const mm = gsap.matchMedia()
        mm.add({ story: STORY_QUERY, pin: PIN_QUERY }, (context) => {
          if (!context.conditions?.story) return
          html.dataset.scrollStory = 'on'
          buildHomeStory(gsap, root, { pinned: Boolean(context.conditions.pin), headerOffset })
          return () => {
            if (html.dataset.scrollStory === 'on') delete html.dataset.scrollStory
          }
        })
        revert = () => mm.revert()

        // Web fonts change text heights → recompute trigger positions once they are in.
        void document.fonts?.ready.then(() => {
          if (!cancelled) ScrollTrigger.refresh()
        })
      } catch (error) {
        if (cancelled) return
        // Release the sticky tracks (CSS keys off "off") without moving what the user is reading:
        // compensate for spacers that are already above the viewport.
        const removed = [...document.querySelectorAll<HTMLElement>('.story-spacer')]
          .filter((spacer) => spacer.getBoundingClientRect().bottom <= 0)
          .reduce((sum, spacer) => sum + spacer.offsetHeight, 0)
        html.dataset.scrollStory = 'off'
        if (removed > 0) window.scrollBy(0, -removed)
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[scroll-story] animation library unavailable, static page kept', error)
        }
      }
    }

    function start() {
      if (started || cancelled) return
      started = true
      clearSchedule()
      void load()
    }

    const schedule = () => {
      if (started || !desktop.matches) return
      INPUT_EVENTS.forEach((type) =>
        window.addEventListener(type, start, { once: true, passive: true }),
      )
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS })
      } else {
        timeoutId = window.setTimeout(start, IDLE_TIMEOUT_MS)
      }
    }

    // A small window that later grows to desktop size loads the story then (once).
    desktop.addEventListener('change', schedule)
    schedule()

    return () => {
      cancelled = true
      desktop.removeEventListener('change', schedule)
      clearSchedule()
      revert?.()
      delete html.dataset.scrollStory
    }
  }, [layoutKey])

  return null
}
