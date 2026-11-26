import { act, cleanup, fireEvent, render } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HeroStage, type HeroApp, type HeroLabels } from '@/components/home/HeroStage'
import { HERO_AUTOPLAY_MS } from '@/components/home/heroCarouselModel'

const LABELS: HeroLabels = {
  carousel: 'Featured apps',
  prev: 'Previous app',
  next: 'Next app',
  goTo: 'Show {name}',
}

const shot = (app: number, index: number) => ({
  src: `/media/app-${app}-${index}.png`,
  width: 540,
  height: 960,
  alt: `App ${app} screenshot ${index}`,
})

/** `n` apps with `shots` screenshots each (or one count per app). */
const makeApps = (
  n: number,
  shots: number | number[] = 3,
  overrides: Partial<HeroApp> = {},
): HeroApp[] =>
  Array.from({ length: n }, (_, i) => {
    const count = Array.isArray(shots) ? (shots[i] ?? 0) : shots
    return {
      id: i + 1,
      name: `App ${i + 1}`,
      href: `/apps/app-${i + 1}`,
      shortDescription: `Description ${i + 1}`,
      screens: Array.from({ length: count }, (_, s) => shot(i + 1, s + 1)),
      icon: null,
      ...overrides,
    }
  })

const mount = (apps: HeroApp[]) => render(React.createElement(HeroStage, { apps, labels: LABELS }))

const group = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-hero-carousel]')!
const active = (c: HTMLElement) => Number(group(c).dataset.activeIndex)
const phones = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[data-hero-phone-link]')]
const slots = (c: HTMLElement) => phones(c).map((p) => p.dataset.slot)
const phoneHref = (c: HTMLElement, slot: string) =>
  c.querySelector(`[data-hero-phone-link][data-slot="${slot}"]`)?.getAttribute('href')
/** Alt of the screen the phone in `slot` shows right now (its `cur` layer). */
const phoneAlt = (c: HTMLElement, slot: string) =>
  c
    .querySelector(`[data-hero-phone-link][data-slot="${slot}"] [data-role="cur"] img`)
    ?.getAttribute('alt')
const button = (c: HTMLElement, name: string) =>
  c.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)
const segments = (c: HTMLElement) => [
  ...c.querySelectorAll<HTMLButtonElement>('[data-hero-progress] button'),
]
const fill = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-testid="hero-progress-fill"]')
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
/** One full manual step: click, then let the slide finish and commit. */
const step = (c: HTMLElement, name: string) => {
  fireEvent.click(button(c, name)!)
  advance(1000)
}
/** The CSS fill finished its 5 s run (jsdom does not run CSS animations). */
const endFill = (c: HTMLElement) => {
  fireEvent.animationEnd(fill(c)!)
  advance(1000)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('HeroStage phones show the screenshots of one app', () => {
  it('renders three phones with screenshots 2, 1, 3 of the same app (left, centre, right)', () => {
    const { container } = mount(makeApps(3))
    expect(slots(container)).toEqual(['left', 'center', 'right'])
    expect(phoneAlt(container, 'left')).toBe('App 1 screenshot 2')
    expect(phoneAlt(container, 'center')).toBe('App 1 screenshot 1')
    expect(phoneAlt(container, 'right')).toBe('App 1 screenshot 3')
    for (const slot of ['left', 'center', 'right']) {
      expect(phoneHref(container, slot)).toBe('/apps/app-1')
    }

    step(container, 'Next app')
    expect(phoneAlt(container, 'left')).toBe('App 2 screenshot 2')
    expect(phoneAlt(container, 'center')).toBe('App 2 screenshot 1')
    expect(phoneAlt(container, 'right')).toBe('App 2 screenshot 3')
  })

  it('renders one centred phone for a one-screenshot app and two for a two-screenshot app', () => {
    const { container } = mount(makeApps(3, [1, 2, 10]))
    expect(slots(container)).toEqual(['center'])
    expect(phoneAlt(container, 'center')).toBe('App 1 screenshot 1')

    step(container, 'Next app')
    expect(slots(container)).toEqual(['left', 'center'])
    expect(phoneAlt(container, 'left')).toBe('App 2 screenshot 2')
    expect(phoneAlt(container, 'center')).toBe('App 2 screenshot 1')

    step(container, 'Next app')
    expect(slots(container)).toEqual(['left', 'center', 'right'])
    expect(phoneAlt(container, 'right')).toBe('App 3 screenshot 3')

    step(container, 'Next app')
    expect(slots(container)).toEqual(['center'])
  })

  it('a neighbour without a screenshot for a slot slides in an empty screen', () => {
    const { container } = mount(makeApps(2, [3, 1]))
    fireEvent.pointerEnter(group(container), { pointerType: 'mouse' })
    const left = container.querySelector('[data-hero-phone-link][data-slot="left"]')!
    const incoming = left.querySelector('[data-role="next"]')!
    expect(incoming).not.toBeNull()
    expect(incoming.querySelector('img')).toBeNull()
  })

  it('an app without screenshots still renders one empty centred phone', () => {
    const { container } = mount(makeApps(3, 0, { shortDescription: null }))
    expect(slots(container)).toEqual(['center'])
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.querySelector('[data-hero-caption-text]')).toBeNull()
    expect(container.querySelector('[data-hero-caption-link]')?.textContent).toBe('App 1')
    step(container, 'Next app')
    expect(active(container)).toBe(1)
  })
})

describe('HeroStage controls', () => {
  it('has no pause/play button', () => {
    const { container } = mount(makeApps(3))
    expect(button(container, 'Pause slideshow')).toBeNull()
    expect(button(container, 'Start slideshow')).toBeNull()
    expect(container.querySelectorAll('button[aria-label*="slideshow" i]')).toHaveLength(0)
  })

  it('renders one progress segment per app, the first marked aria-current', () => {
    const { container } = mount(makeApps(5))
    const buttons = segments(container)
    expect(buttons).toHaveLength(5)
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Show App 1',
      'Show App 2',
      'Show App 3',
      'Show App 4',
      'Show App 5',
    ])
    expect(buttons[0]!.getAttribute('aria-current')).toBe('true')
    expect(buttons.slice(1).every((b) => !b.hasAttribute('aria-current'))).toBe(true)
    expect(buttons.every((b) => b.type === 'button')).toBe(true)
    expect(container.querySelectorAll('[data-testid="hero-progress-fill"]')).toHaveLength(1)
    expect(buttons[0]!.contains(fill(container))).toBe(true)
  })

  it('fires one step when the active fill animation ends (fireEvent.animationEnd)', () => {
    const { container } = mount(makeApps(3))
    expect(fill(container)!.dataset.running).toBe('true')
    // No JS countdown any more: time alone never steps.
    advance(HERO_AUTOPLAY_MS * 3)
    expect(active(container)).toBe(0)

    endFill(container)
    expect(active(container)).toBe(1)
    expect(segments(container)[1]!.getAttribute('aria-current')).toBe('true')
    expect(segments(container)[1]!.contains(fill(container))).toBe(true)
    // Nothing queued: exactly one step per completed fill.
    advance(HERO_AUTOPLAY_MS * 2)
    expect(active(container)).toBe(1)
  })

  it('the fill restarts (remounts) for each new app and a manual step restarts it too', () => {
    const { container } = mount(makeApps(3))
    const first = fill(container)
    step(container, 'Next app')
    const second = fill(container)
    expect(second).not.toBe(first)
    expect(second!.dataset.running).toBe('true')
  })

  it('stops filling (data-running=false) while hovered and keeps the same segment', () => {
    const { container } = mount(makeApps(3))
    const before = fill(container)
    fireEvent.pointerEnter(group(container), { pointerType: 'mouse' })
    expect(fill(container)!.dataset.running).toBe('false')
    // Same element: the animation is frozen, not restarted.
    expect(fill(container)).toBe(before)
    expect(segments(container)[0]!.getAttribute('aria-current')).toBe('true')
    // The live region announces changes only while autoplay is stopped.
    expect(container.querySelector('[aria-live]')?.getAttribute('aria-live')).toBe('polite')

    fireEvent.pointerLeave(group(container), { pointerType: 'mouse' })
    expect(fill(container)).toBe(before)
    expect(fill(container)!.dataset.running).toBe('true')
    expect(container.querySelector('[aria-live]')?.getAttribute('aria-live')).toBe('off')
  })

  it('clicking segment N shows app N', () => {
    const { container } = mount(makeApps(5))
    fireEvent.click(segments(container)[3]!)
    advance(1000)
    expect(active(container)).toBe(3)
    expect(phoneHref(container, 'center')).toBe('/apps/app-4')
    expect(container.querySelector('[data-hero-caption-link]')?.getAttribute('href')).toBe(
      '/apps/app-4',
    )
    expect(segments(container)[3]!.getAttribute('aria-current')).toBe('true')
    expect(segments(container)[3]!.contains(fill(container))).toBe(true)
  })

  it('a segment click while a slide is running is ignored', () => {
    const { container } = mount(makeApps(5))
    fireEvent.click(button(container, 'Next app')!)
    fireEvent.click(segments(container)[4]!)
    advance(1000)
    expect(active(container)).toBe(1)
  })

  it('a single app renders no segments, no arrows and no fill', () => {
    const { container } = mount(makeApps(1))
    // Its three screenshots still fill the stage.
    expect(slots(container)).toEqual(['left', 'center', 'right'])
    expect(segments(container)).toHaveLength(0)
    expect(container.querySelector('[data-hero-progress]')).toBeNull()
    expect(fill(container)).toBeNull()
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(container.querySelector('[data-hero-caption-link]')?.getAttribute('href')).toBe(
      '/apps/app-1',
    )
    advance(HERO_AUTOPLAY_MS * 4)
    expect(active(container)).toBe(0)
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1) // at most the idle warm-up
  })
})

describe('HeroStage touch interaction stops autoplay (WCAG 2.2.2)', () => {
  /** A tap: the pointer type comes from `pointerdown`, then the click follows. */
  const tap = (c: HTMLElement, target: HTMLElement, pointerType: string) => {
    fireEvent.pointerDown(target, { pointerType, pointerId: 1 })
    fireEvent.pointerUp(target, { pointerType, pointerId: 1 })
    fireEvent.click(target)
    advance(1000)
  }

  it('a touch tap on next stops autoplay for good: the fill stops and its end steps no more', () => {
    const { container } = mount(makeApps(3))
    tap(container, button(container, 'Next app')!, 'touch')
    expect(active(container)).toBe(1)
    expect(fill(container)!.dataset.running).toBe('false')
    expect(container.querySelector('[aria-live]')?.getAttribute('aria-live')).toBe('polite')

    endFill(container)
    advance(HERO_AUTOPLAY_MS * 3)
    expect(active(container)).toBe(1)
    // Manual control keeps working.
    step(container, 'Next app')
    expect(active(container)).toBe(2)
    expect(fill(container)!.dataset.running).toBe('false')
  })

  it('a pen tap on a segment stops autoplay too', () => {
    const { container } = mount(makeApps(4))
    tap(container, segments(container)[2]!, 'pen')
    expect(active(container)).toBe(2)
    expect(fill(container)!.dataset.running).toBe('false')
  })

  it('a touch swipe on the phones stops autoplay', () => {
    const { container } = mount(makeApps(3))
    const stage = group(container).querySelector<HTMLElement>(':scope > [aria-hidden="true"]')!
    fireEvent.pointerDown(stage, { pointerType: 'touch', pointerId: 7, clientX: 200, clientY: 100 })
    fireEvent.pointerUp(stage, { pointerType: 'touch', pointerId: 7, clientX: 100, clientY: 102 })
    advance(1000)
    expect(active(container)).toBe(1)
    expect(fill(container)!.dataset.running).toBe('false')
  })

  it('a mouse tap on next keeps autoplay running', () => {
    const { container } = mount(makeApps(3))
    tap(container, button(container, 'Next app')!, 'mouse')
    expect(active(container)).toBe(1)
    expect(fill(container)!.dataset.running).toBe('true')
    endFill(container)
    expect(active(container)).toBe(2)
  })

  it('a keyboard activation after an earlier touch tap elsewhere does not count as touch', () => {
    const { container } = mount(makeApps(3))
    // A touch on the caption (not a control) is not a manual step and stops nothing.
    fireEvent.pointerDown(container.querySelector('[data-hero-caption]')!, {
      pointerType: 'touch',
    })
    expect(fill(container)!.dataset.running).toBe('true')
    fireEvent.keyDown(button(container, 'Next app')!, { key: 'Enter' })
    fireEvent.click(button(container, 'Next app')!)
    advance(1000)
    expect(active(container)).toBe(1)
    expect(fill(container)!.dataset.running).toBe('true')
  })
})

describe('HeroStage caption card', () => {
  it('shows icon, name link and description of the app in the centre', () => {
    const { container } = mount(makeApps(3))
    const caption = container.querySelector('[data-hero-caption]')!
    expect(caption.querySelector('[data-hero-caption-link]')?.textContent).toBe('App 1')
    expect(caption.querySelector('[data-hero-caption-text]')?.textContent).toBe('Description 1')
    // AppIcon falls back to the initial when the icon upload is missing.
    const hidden = [...caption.querySelectorAll('[aria-hidden="true"]')]
    expect(hidden.some((el) => el.textContent === 'A')).toBe(true)
    step(container, 'Next app')
    expect(container.querySelector('[data-hero-caption-link]')?.textContent).toBe('App 2')
  })
})

describe('HeroStage with two apps', () => {
  it('steps both ways and wraps', () => {
    const { container } = mount(makeApps(2))
    step(container, 'Next app')
    expect(active(container)).toBe(1)
    expect(phoneHref(container, 'center')).toBe('/apps/app-2')
    step(container, 'Next app')
    expect(active(container)).toBe(0)
    step(container, 'Previous app')
    expect(active(container)).toBe(1)
  })
})

describe('HeroStage with eight apps', () => {
  it('wraps forwards through all apps back to the start and backwards from the first', () => {
    const { container } = mount(makeApps(8))
    for (let i = 0; i < 8; i++) step(container, 'Next app')
    expect(active(container)).toBe(0)
    step(container, 'Previous app')
    expect(active(container)).toBe(7)
    expect(phoneAlt(container, 'center')).toBe('App 8 screenshot 1')
  })

  it('never mounts more than 3 screens per phone (previous, current and next app)', () => {
    const { container } = mount(makeApps(8))
    fireEvent.pointerEnter(group(container), { pointerType: 'mouse' })
    for (let i = 0; i < 9; i++) {
      step(container, 'Next app')
      for (const phone of phones(container)) {
        expect(phone.querySelectorAll('.hero-track > div').length).toBeLessThanOrEqual(3)
      }
      const imgs = [...container.querySelectorAll('[data-hero-phone-link] img')]
      expect(imgs.length).toBeLessThanOrEqual(9)
    }
  })

  it('only the current screens are mounted until the first interaction', () => {
    const { container } = mount(makeApps(8))
    expect(container.querySelectorAll('.hero-track > div')).toHaveLength(3) // one per phone
    fireEvent.pointerEnter(group(container), { pointerType: 'mouse' })
    expect(container.querySelectorAll('.hero-track > div')).toHaveLength(9)
  })
})

describe('HeroStage timing edge cases', () => {
  it('ignores a click that lands while a slide is running (exactly one step)', () => {
    const { container } = mount(makeApps(3))
    const next = button(container, 'Next app')!
    fireEvent.click(next)
    fireEvent.click(next)
    fireEvent.click(next)
    advance(1000)
    expect(active(container)).toBe(1)
  })

  it('clears its timers on unmount (no step after the page is gone)', () => {
    const { container, unmount } = mount(makeApps(3))
    fireEvent.click(button(container, 'Next app')!)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
