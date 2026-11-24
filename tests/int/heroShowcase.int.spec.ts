import { describe, expect, it } from 'vitest'

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
