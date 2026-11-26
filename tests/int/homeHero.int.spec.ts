import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { HomeHero, type ShowcaseApp } from '@/components/home/HomeHero'
import { en } from '@/i18n/dictionaries/en'
import type { Home } from '@/payload-types'

const hero = { headline: 'Apps for everyday life', subheadline: 'Built by KCT' } as Home['hero']
const stats = { totalApps: 3, totalCategories: 2, topDownloadsLabel: null }

const app = (id: number, screenshots: unknown[]): ShowcaseApp =>
  ({
    id,
    name: `App ${id}`,
    slug: `app-${id}`,
    shortDescription: null,
    screenshots,
    icon: null,
  }) as unknown as ShowcaseApp

const mount = (showcase: ShowcaseApp[]) =>
  render(React.createElement(HomeHero, { hero, showcase, stats, locale: 'en', dict: en as never }))

afterEach(cleanup)

describe('HomeHero', () => {
  it('renders the section without a carousel when no showcase app has populated screenshots', () => {
    // Depth 0 (ids only), nulls and empty lists: nothing to put on a phone.
    const { container } = mount([app(1, [7, 8]), app(2, [null]), app(3, [])])
    const section = container.querySelector('section[aria-labelledby="hero-title"]')
    expect(section).not.toBeNull()
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('h1')?.textContent).toBe('Apps for everyday life')
    expect(container.querySelector('[data-hero-carousel]')).toBeNull()
    expect(container.querySelector('dl')).not.toBeNull()
  })

  it('renders the carousel with only the apps that have a populated screenshot', () => {
    const shot = { id: 1, url: '/media/s1.png', updatedAt: '2026-01-01', width: 540, height: 960 }
    const { container } = mount([app(1, [7]), app(2, [shot])])
    const carousel = container.querySelector<HTMLElement>('[data-hero-carousel]')
    expect(carousel).not.toBeNull()
    expect(carousel!.dataset.count).toBe('1')
  })
})
