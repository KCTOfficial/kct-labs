import { describe, expect, it } from 'vitest'

import { toHeroApp } from '@/components/home/heroApps'
import type { ShowcaseApp } from '@/components/home/HomeHero'
import { Home } from '@/globals/Home/config'
import { HERO_SHOWCASE_MAX, normalizeShowcase } from '@/utilities/apps/heroShowcase'

describe('normalizeShowcase', () => {
  it('drops repeated ids and keeps the first occurrence in order', () => {
    expect(normalizeShowcase([{ id: 1 }, { id: 2 }, { id: 1 }])).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('caps the list at HERO_SHOWCASE_MAX, preserving order', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
    const result = normalizeShowcase(items)
    expect(result).toHaveLength(HERO_SHOWCASE_MAX)
    expect(result.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('returns an empty list for no input', () => {
    expect(normalizeShowcase([])).toEqual([])
  })

  it('caps after de-duplicating, not before', () => {
    const items = [{ id: 1 }, { id: 1 }, ...Array.from({ length: 8 }, (_, i) => ({ id: i + 2 }))]
    expect(normalizeShowcase(items)).toHaveLength(HERO_SHOWCASE_MAX)
  })
})

describe('Home global showcase field', () => {
  it('allows up to HERO_SHOWCASE_MAX (8) apps', () => {
    expect(HERO_SHOWCASE_MAX).toBe(8)
    const heroTab = (
      Home.fields[0] as { tabs: Array<{ name?: string; fields: unknown[] }> }
    ).tabs.find((tab) => tab.name === 'hero')
    const field = heroTab?.fields.find((f) => (f as { name?: string }).name === 'showcaseApps') as
      { hasMany?: boolean; maxRows?: number } | undefined
    expect(field?.hasMany).toBe(true)
    expect(field?.maxRows).toBe(HERO_SHOWCASE_MAX)
  })
})

describe('toHeroApp', () => {
  const dict = { app: { screenshotAlt: '{name} screenshot {index}' } } as never
  const media = (n: number, extra: object = {}) => ({
    id: n,
    url: `/media/s${n}.png`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    width: 100,
    height: 200,
    alt: null,
    ...extra,
  })
  const make = (screenshots: unknown[], icon: unknown = null) =>
    ({
      id: 1,
      name: 'Foo',
      slug: 'foo',
      shortDescription: ' desc ',
      screenshots,
      icon,
    }) as unknown as ShowcaseApp

  it('maps at most 3 screens per app, skips non-populated uploads', () => {
    const app = make([5, null, media(1), {}, media(2), media(3), media(4)])
    const hero = toHeroApp(app, 'en', dict)
    expect(hero.screens).toHaveLength(3)
    expect(hero.screens.map((s) => s.alt)).toEqual([
      'Foo screenshot 1',
      'Foo screenshot 2',
      'Foo screenshot 3',
    ])
    // Screenshot 1 is the centre phone (and the LCP); the legacy single `image` field is gone.
    expect(hero.screens[0]!.src).toContain('/media/s1.png')
    expect('image' in hero).toBe(false)
    expect(hero.shortDescription).toBe('desc')
  })

  it('has no screens and a null icon when nothing is populated', () => {
    const hero = toHeroApp(make([7], 9), 'en', dict)
    expect(hero.screens).toEqual([])
    expect('image' in hero).toBe(false)
    expect(hero.icon).toBeNull()
  })

  it('keeps a populated icon', () => {
    expect(toHeroApp(make([], media(9)), 'en', dict).icon?.url).toBe('/media/s9.png')
  })
})
