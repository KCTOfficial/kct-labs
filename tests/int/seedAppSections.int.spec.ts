import { describe, expect, it } from 'vitest'

import { isAppIconName } from '@/fields/appIcons'
import { seedAppAccents, seedApps, seedFeatureIcons } from '@/endpoints/seed/kct/content'
import {
  featuresEditedByEditor,
  highlightIndexes,
  mergeFeatureRows,
  mergeHighlights,
} from '@/endpoints/seed/kct/sections'
import { isAccentPreset } from '@/utilities/apps/accent'
import { MAX_HIGHLIGHTS } from '@/utilities/apps/sectionLimits'

describe('mergeFeatureRows', () => {
  it('fills the icon of legacy rows from the seed and keeps their ids', () => {
    const rows = mergeFeatureRows(['A', 'B'], ['zap', 'wallet'], [{ id: 'r1' }, { id: 'r2' }])
    expect(rows).toEqual([
      { id: 'r1', label: 'A', icon: 'zap' },
      { id: 'r2', label: 'B', icon: 'wallet' },
    ])
  })

  it('keeps an icon that is already set on the row', () => {
    const rows = mergeFeatureRows(['A'], ['zap'], [{ id: 'r1', icon: 'camera' }])
    expect(rows).toEqual([{ id: 'r1', label: 'A', icon: 'camera' }])
  })

  it('creates rows without ids when nothing exists yet', () => {
    expect(mergeFeatureRows(['A'], ['zap'], null)).toEqual([
      { id: undefined, label: 'A', icon: 'zap' },
    ])
  })

  it('copes with fewer or more seed labels than existing rows (ids stay with their index)', () => {
    const existing = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]
    expect(mergeFeatureRows(['A'], ['zap'], existing).map((r) => r.id)).toEqual(['r1'])
    const more = mergeFeatureRows(['A', 'B', 'C', 'D'], [], [{ id: 'r1' }])
    expect(more.map((r) => r.id)).toEqual(['r1', undefined, undefined, undefined])
    expect(more.every((r) => r.icon === undefined)).toBe(true) // no seed icon → left empty
  })
})

describe('featuresEditedByEditor', () => {
  const icons = ['zap', 'wallet', 'camera']
  const legacy = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] // labels only: never edited, never seeded icons
  const seeded = [
    { id: 'a', icon: 'zap' },
    { id: 'b', icon: 'wallet' },
    { id: 'c', icon: 'camera' },
  ]

  it('is false for legacy rows and for rows the seed itself wrote', () => {
    expect(featuresEditedByEditor([legacy, legacy], 3, icons)).toBe(false)
    expect(featuresEditedByEditor([seeded, seeded], 3, icons)).toBe(false)
    expect(featuresEditedByEditor([], 3, icons)).toBe(false) // new app
  })

  it('is true once an editor added a description in either locale', () => {
    const edited = [{ id: 'a', icon: 'zap', description: 'Mine' }, ...seeded.slice(1)]
    expect(featuresEditedByEditor([seeded, edited], 3, icons)).toBe(true)
  })

  it('is true once an editor chose another icon', () => {
    const edited = [{ id: 'a', icon: 'star' }, ...seeded.slice(1)]
    expect(featuresEditedByEditor([edited, edited], 3, icons)).toBe(true)
  })

  it('is true when rows were added, removed or reordered (row count or icons no longer match the seed)', () => {
    expect(featuresEditedByEditor([[...seeded, { id: 'd' }]], 3, icons)).toBe(true)
    expect(featuresEditedByEditor([seeded.slice(0, 2)], 3, icons)).toBe(true)
    const reordered = [seeded[2]!, seeded[0]!, seeded[1]!]
    expect(featuresEditedByEditor([reordered], 3, icons)).toBe(true)
  })
})

describe('mergeHighlights', () => {
  const seed = [
    { icon: 'zap', title: 'Fast' },
    { icon: 'wallet', title: 'Cheap' },
  ]

  it('writes the seed rows only when the app had no highlights at the start of the run', () => {
    expect(mergeHighlights(seed, null)).toEqual(seed.map((r) => ({ ...r, id: undefined })))
    expect(mergeHighlights(seed, [])).toEqual(seed.map((r) => ({ ...r, id: undefined })))
  })

  it('leaves the field alone when an editor already added rows', () => {
    expect(mergeHighlights(seed, [{ title: 'Mine' }])).toBeUndefined()
  })

  it('carries the row ids returned by the previous locale write', () => {
    const rows = mergeHighlights(seed, null, [{ id: 'h1' }, { id: 'h2' }])
    expect(rows?.map((r) => r.id)).toEqual(['h1', 'h2'])
  })

  it('writes nothing for an empty seed', () => {
    expect(mergeHighlights([], null)).toBeUndefined()
  })
})

describe('highlightIndexes', () => {
  it('takes the first three features whose labels fit in both languages', () => {
    const en = ['One', 'x'.repeat(41), 'Three', 'Four', 'Five']
    const id = ['Satu', 'Dua', 'Tiga', 'Empat', 'Lima']
    expect(highlightIndexes(en, id)).toEqual([0, 2, 3])
    expect(highlightIndexes(en, id).length).toBeLessThanOrEqual(MAX_HIGHLIGHTS)
  })

  it('skips a feature that is too long in only one language (rows must match across locales)', () => {
    expect(highlightIndexes(['A', 'B'], ['x'.repeat(41), 'Bee'])).toEqual([1])
  })
})

describe('seed data for the new fields', () => {
  it('every seed app has a valid accent preset and registry icons for its features', () => {
    for (const app of seedApps) {
      expect(isAccentPreset(seedAppAccents[app.slug]), `${app.slug} accent`).toBe(true)
      const icons = seedFeatureIcons[app.slug] ?? []
      expect(icons.length, `${app.slug} icons`).toBe(app.features.en.length)
      for (const icon of icons) expect(isAppIconName(icon), `${app.slug}: ${icon}`).toBe(true)
    }
  })
})
