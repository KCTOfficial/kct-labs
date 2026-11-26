import { act, cleanup, fireEvent, render } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HeroStage, type HeroApp, type HeroLabels } from '@/components/home/HeroStage'
import { HERO_AUTOPLAY_MS } from '@/components/home/heroCarouselModel'

const LABELS: HeroLabels = {
  carousel: 'Featured apps',
  prev: 'Previous app',
  next: 'Next app',
  pause: 'Pause slideshow',
  play: 'Start slideshow',
}

const makeApps = (n: number, overrides: Partial<HeroApp> = {}): HeroApp[] =>
  Array.from({ length: n }, (_, i) => {
    const image = {
      src: `/media/app-${i + 1}.png`,
      width: 540,
      height: 960,
      alt: `App ${i + 1} shot`,
    }
    return {
      id: i + 1,
      name: `App ${i + 1}`,
      href: `/apps/app-${i + 1}`,
      shortDescription: `Description ${i + 1}`,
      image,
      screens: [image],
      icon: null,
      ...overrides,
    }
  })

const mount = (apps: HeroApp[]) => render(React.createElement(HeroStage, { apps, labels: LABELS }))

const group = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-hero-carousel]')!
const active = (c: HTMLElement) => Number(group(c).dataset.activeIndex)
const phoneHref = (c: HTMLElement, slot: string) =>
  c.querySelector(`[data-hero-phone-link][data-slot="${slot}"]`)?.getAttribute('href')
const button = (c: HTMLElement, name: string) =>
  c.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
/** One full manual step: click, then let the slide finish and commit. */
const step = (c: HTMLElement, name: string) => {
  fireEvent.click(button(c, name)!)
  advance(1000)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('HeroStage with a single app', () => {
  it('renders one centred phone, the caption, no controls and never starts a timer', () => {
    const { container } = mount(makeApps(1))
    expect(container.querySelectorAll('[data-hero-phone-link]')).toHaveLength(1)
    expect(phoneHref(container, 'center')).toBe('/apps/app-1')
    expect(container.querySelector('[data-hero-caption-link]')?.getAttribute('href')).toBe(
      '/apps/app-1',
    )
    expect(container.querySelectorAll('button')).toHaveLength(0)
    advance(HERO_AUTOPLAY_MS * 4)
    expect(active(container)).toBe(0)
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1) // at most the idle warm-up
  })
})

describe('HeroStage with two apps', () => {
  it('shows two phones (other app left, first app centre) and steps both ways', () => {
    const { container } = mount(makeApps(2))
    expect(container.querySelectorAll('[data-hero-phone-link]')).toHaveLength(2)
    expect(phoneHref(container, 'left')).toBe('/apps/app-2')
    expect(phoneHref(container, 'center')).toBe('/apps/app-1')

    step(container, 'Next app')
    expect(active(container)).toBe(1)
    expect(phoneHref(container, 'center')).toBe('/apps/app-2')
    expect(phoneHref(container, 'left')).toBe('/apps/app-1')

    step(container, 'Previous app')
    expect(active(container)).toBe(0)
  })

  it('autoplay steps once per countdown and stops while the pause button is on', () => {
    const { container } = mount(makeApps(2))
    advance(HERO_AUTOPLAY_MS + 1000)
    expect(active(container)).toBe(1)

    fireEvent.click(button(container, 'Pause slideshow')!)
    advance(HERO_AUTOPLAY_MS * 3)
    expect(active(container)).toBe(1)
    expect(button(container, 'Start slideshow')).not.toBeNull()
  })
})

describe('HeroStage with eight apps', () => {
  it('wraps forwards through all apps back to the start and backwards from the first', () => {
    const { container } = mount(makeApps(8))
    for (let i = 0; i < 8; i++) step(container, 'Next app')
    expect(active(container)).toBe(0)
    step(container, 'Previous app')
    expect(active(container)).toBe(7)
    expect(phoneHref(container, 'center')).toBe('/apps/app-8')
    expect(phoneHref(container, 'left')).toBe('/apps/app-7')
    expect(phoneHref(container, 'right')).toBe('/apps/app-1')
  })

  it('never mounts more than 3 screens per phone, so 5 distinct images at most', () => {
    const { container } = mount(makeApps(8))
    fireEvent.pointerEnter(group(container), { pointerType: 'mouse' })
    for (let i = 0; i < 9; i++) {
      step(container, 'Next app')
      const imgs = [...container.querySelectorAll('img')]
      expect(imgs.length).toBeLessThanOrEqual(9)
      const distinct = new Set(imgs.map((img) => decodeURIComponent(img.getAttribute('src') ?? '')))
      // next/image rewrites the URL; the underlying media path is what must stay bounded.
      expect([...distinct].length).toBeLessThanOrEqual(5)
    }
  })

  it('only the current screens are mounted until the first interaction', () => {
    const { container } = mount(makeApps(8))
    expect(container.querySelectorAll('.hero-track > div')).toHaveLength(3) // one per phone
    fireEvent.pointerEnter(group(container), { pointerType: 'mouse' })
    expect(container.querySelectorAll('.hero-track > div')).toHaveLength(9)
  })
})

describe('HeroStage data edge cases', () => {
  it('renders an app without screenshots (empty screen) and without a description', () => {
    const apps = makeApps(3, { image: null, shortDescription: null })
    const { container } = mount(apps)
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.querySelector('[data-hero-caption-text]')).toBeNull()
    expect(container.querySelector('[data-hero-caption-link]')?.textContent).toBe('App 1')
    step(container, 'Next app')
    expect(active(container)).toBe(1)
  })

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
