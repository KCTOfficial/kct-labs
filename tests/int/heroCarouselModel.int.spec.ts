import { describe, expect, it } from 'vitest'

import {
  HERO_AUTOPLAY_MS,
  HERO_SLIDE_MS,
  HERO_STAGGER_MS,
  HERO_MAX_SCREENS,
  HERO_SWIPE_PX,
  hasScreens,
  isAutoplayRunning,
  layerWindow,
  screenIndexes,
  slotScreenIndex,
  stageSlots,
  stepActive,
  swipeDirection,
  wrapIndex,
  type AutoplayState,
} from '@/components/home/heroCarouselModel'

describe('timing constants', () => {
  it('match the spec values', () => {
    expect([HERO_AUTOPLAY_MS, HERO_SLIDE_MS, HERO_STAGGER_MS, HERO_SWIPE_PX]).toEqual([
      5000, 500, 60, 40,
    ])
  })
})

describe('wrapIndex', () => {
  it('wraps negative and overflowing indexes', () => {
    expect(wrapIndex(-1, 3)).toBe(2)
    expect(wrapIndex(3, 3)).toBe(0)
    expect(wrapIndex(-9, 8)).toBe(7)
  })

  it('returns 0 when there is nothing to index', () => {
    expect(wrapIndex(5, 0)).toBe(0)
  })
})

describe('stageSlots (phones of one app)', () => {
  it('one phone per screenshot, at least the centre one, at most three', () => {
    expect(stageSlots(0)).toEqual(['center'])
    expect(stageSlots(1)).toEqual(['center'])
    expect(stageSlots(2)).toEqual(['left', 'center'])
    expect(stageSlots(3)).toEqual(['left', 'center', 'right'])
    expect(stageSlots(10)).toEqual(['left', 'center', 'right'])
  })
})

describe('slotScreenIndex (screenshot of an app in a stage slot)', () => {
  it('maps left/centre/right to screenshots 2/1/3', () => {
    expect(['left', 'center', 'right'].map((s) => slotScreenIndex(3, s as 'left'))).toEqual([
      1, 0, 2,
    ])
    expect(slotScreenIndex(10, 'right')).toBe(2)
  })

  it('returns null for a slot the app has no phone in', () => {
    expect(slotScreenIndex(0, 'center')).toBeNull()
    expect(slotScreenIndex(1, 'left')).toBeNull()
    expect(slotScreenIndex(1, 'right')).toBeNull()
    expect(slotScreenIndex(1, 'center')).toBe(0)
    expect(slotScreenIndex(2, 'left')).toBe(1)
    expect(slotScreenIndex(2, 'right')).toBeNull()
  })
})

describe('stepActive', () => {
  it('wraps in both directions', () => {
    expect(stepActive(0, 3, 'prev')).toBe(2)
    expect(stepActive(2, 3, 'next')).toBe(0)
  })

  it('returns to the start after `count` next steps', () => {
    let active = 1
    for (let i = 0; i < 8; i++) active = stepActive(active, 8, 'next')
    expect(active).toBe(1)
  })
})

describe('layerWindow', () => {
  it('lists previous, current and next app shown by every phone', () => {
    expect(layerWindow(0, 8)).toEqual([7, 0, 1])
    expect(layerWindow(7, 8)).toEqual([6, 7, 0])
  })
})

describe('swipeDirection', () => {
  it('maps a leftward swipe to next and a rightward swipe to prev', () => {
    expect(swipeDirection(-60, 5)).toBe('next')
    expect(swipeDirection(60, 5)).toBe('prev')
  })

  it('ignores short or mostly vertical gestures', () => {
    expect(swipeDirection(-30, 0)).toBeNull()
    expect(swipeDirection(-60, 80)).toBeNull()
    expect(swipeDirection(-60, 60)).toBeNull()
  })
})

describe('isAutoplayRunning', () => {
  const clean: AutoplayState = {
    count: 3,
    reducedMotion: false,
    interacting: false,
    pageHidden: false,
    inView: true,
  }

  it('runs for a clean state with 2+ apps', () => {
    expect(isAutoplayRunning(clean)).toBe(true)
    expect(isAutoplayRunning({ ...clean, count: 2 })).toBe(true)
  })

  it('never runs for a single app', () => {
    expect(isAutoplayRunning({ ...clean, count: 1 })).toBe(false)
  })

  it.each([
    ['reducedMotion', { reducedMotion: true }],
    ['interacting', { interacting: true }],
    ['pageHidden', { pageHidden: true }],
    ['out of view', { inView: false }],
  ])('stops when %s', (_label, patch) => {
    expect(isAutoplayRunning({ ...clean, ...patch })).toBe(false)
  })
})

describe('screenIndexes', () => {
  it('handles 0, 1, 2, 3 and 10 screenshots', () => {
    expect(HERO_MAX_SCREENS).toBe(3)
    expect(screenIndexes(0)).toEqual([])
    expect(screenIndexes(1)).toEqual([0])
    expect(screenIndexes(2)).toEqual([1, 0])
    expect(screenIndexes(3)).toEqual([1, 0, 2])
    expect(screenIndexes(10)).toEqual([1, 0, 2])
  })
})

describe('hasScreens', () => {
  it('is false for an empty list', () => {
    expect(hasScreens({ screens: [] })).toBe(false)
  })
  it('is true when at least one screen exists', () => {
    expect(hasScreens({ screens: [{}] })).toBe(true)
  })
})
