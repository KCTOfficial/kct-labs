/**
 * Pure model of the home hero phone carousel (no React, no DOM) so it can be unit tested.
 * One slide = one app: its screenshots fill the stage phones [left, centre, right]; `active` is the
 * index of that app.
 */

import { phoneSlot, type PhoneSlot } from './scrollStoryConfig'

// KEEP IN SYNC with the `.hero-progress-fill` animation duration in globals.css.
export const HERO_AUTOPLAY_MS = 5000
// KEEP IN SYNC with the `.hero-track` transition duration and per-slot delays in globals.css.
export const HERO_SLIDE_MS = 500
export const HERO_STAGGER_MS = 60
/** Horizontal travel (px) a touch has to exceed to count as a swipe. */
export const HERO_SWIPE_PX = 40

export type SlideDirection = 'next' | 'prev'

/** Non-negative modulo; `0` when there is nothing to index. */
export const wrapIndex = (index: number, count: number): number =>
  count <= 0 ? 0 : ((index % count) + count) % count

export const stepActive = (active: number, count: number, direction: SlideDirection): number =>
  wrapIndex(active + (direction === 'next' ? 1 : -1), count)

/** Screens mounted inside every phone: the active app, plus its neighbours for the slide. */
export const layerWindow = (appIndex: number, count: number): [number, number, number] => [
  wrapIndex(appIndex - 1, count),
  wrapIndex(appIndex, count),
  wrapIndex(appIndex + 1, count),
]

/** Screenshots shown per app (left, centre, right phone). */
export const HERO_MAX_SCREENS = 3

/**
 * Screenshot index for each stage position [left, centre, right]. The centre always shows
 * screenshot 1 (index 0 is the left neighbour), so 1 → centre only, 2 → [1, 0], 3+ → [1, 0, 2].
 */
export const screenIndexes = (shotCount: number): number[] => {
  if (shotCount <= 0) return []
  if (shotCount === 1) return [0]
  if (shotCount === 2) return [1, 0]
  return [1, 0, 2]
}

export const hasScreens = (app: { screens: readonly unknown[] }): boolean => app.screens.length > 0

/**
 * Phones on stage for an app with `shotCount` screenshots: one per screenshot (max 3). An app
 * without screenshots still gets the centre phone (empty screen) so the stage never collapses.
 */
export const stageSlots = (shotCount: number): PhoneSlot[] => {
  const phones = Math.max(1, screenIndexes(shotCount).length)
  return Array.from({ length: phones }, (_, position) => phoneSlot(phones, position))
}

/** Screenshot index an app shows in `slot`, or `null` when that app has no phone there. */
export const slotScreenIndex = (shotCount: number, slot: PhoneSlot): number | null => {
  const indexes = screenIndexes(shotCount)
  const position = indexes.findIndex((_, i) => phoneSlot(indexes.length, i) === slot)
  return position < 0 ? null : indexes[position]!
}

/** Swipe left → next, right → prev; short or mostly vertical gestures are not swipes. */
export const swipeDirection = (
  dx: number,
  dy: number,
  threshold: number = HERO_SWIPE_PX,
): SlideDirection | null => {
  if (Math.abs(dx) < threshold || Math.abs(dy) >= Math.abs(dx)) return null
  return dx < 0 ? 'next' : 'prev'
}

export type AutoplayState = {
  count: number
  reducedMotion: boolean
  /** Mouse hover or keyboard focus inside the carousel. */
  interacting: boolean
  pageHidden: boolean
  inView: boolean
}

export const isAutoplayRunning = (state: AutoplayState): boolean =>
  state.count > 1 && !state.reducedMotion && !state.interacting && !state.pageHidden && state.inView
