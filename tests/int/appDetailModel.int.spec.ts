import { describe, expect, it } from 'vitest'

import { heroPhones, toDetailSections } from '@/components/apps/detail/model'
import type { ImageSource } from '@/components/site/media'

const media = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  url: `/media/${id}.png`,
  updatedAt: '2026-01-01T00:00:00.000Z',
  width: 540,
  height: 960,
  alt: null,
  ...extra,
})

const app = (overrides: Record<string, unknown> = {}) =>
  ({
    accentColor: null,
    highlights: null,
    howItWorks: null,
    featuresIntro: null,
    features: null,
    dataControl: null,
    ...overrides,
  }) as never

const stepAlt = (title: string, index: number) => `alt:${index}:${title}`

describe('toDetailSections', () => {
  it('an app without any new field yields empty sections (old apps render as before)', () => {
    const sections = toDetailSections(app(), stepAlt)
    expect(sections).toEqual({
      accent: null,
      highlights: [],
      howItWorks: null,
      featuresIntro: { title: null, description: null },
      features: [],
      dataControl: null,
    })
  })

  it('keeps legacy features that only have a label (no icon, no description)', () => {
    const { features } = toDetailSections(app({ features: [{ id: 'a', label: 'Plain' }] }), stepAlt)
    expect(features).toEqual([{ icon: null, label: 'Plain', description: null }])
  })

  it('drops features with a blank label and trims text', () => {
    const { features } = toDetailSections(
      app({
        features: [
          { label: '   ' },
          { label: '  Budget  ', icon: ' wallet ', description: '  Monthly  ' },
        ],
      }),
      stepAlt,
    )
    expect(features).toEqual([{ icon: 'wallet', label: 'Budget', description: 'Monthly' }])
  })

  it('caps highlights at 3 and drops rows without a title', () => {
    const rows = [1, 2, 3, 4].map((n) => ({ icon: 'zap', title: `H${n}` }))
    expect(
      toDetailSections(app({ highlights: rows }), stepAlt).highlights.map((h) => h.title),
    ).toEqual(['H1', 'H2', 'H3'])
    const sparse = toDetailSections(
      app({ highlights: [{ icon: 'zap' }, { title: ' ' }, { title: 'Kept' }] }),
      stepAlt,
    )
    expect(sparse.highlights).toEqual([{ icon: null, title: 'Kept', description: null }])
  })

  it('How it works is null without steps, and keeps at most 4 steps with images resolved', () => {
    expect(
      toDetailSections(app({ howItWorks: { title: 'T', steps: [] } }), stepAlt).howItWorks,
    ).toBeNull()
    const steps = [1, 2, 3, 4, 5].map((n) => ({ title: `S${n}`, image: media(n) }))
    const { howItWorks } = toDetailSections(
      app({ howItWorks: { title: 'Simple', description: 'D', steps } }),
      stepAlt,
    )
    expect(howItWorks?.title).toBe('Simple')
    expect(howItWorks?.steps.map((s) => s.title)).toEqual(['S1', 'S2', 'S3', 'S4'])
    expect(howItWorks?.steps[0]?.image).toMatchObject({
      src: expect.stringContaining('/media/1.png'),
    })
  })

  it('a step image that is not populated (id only, deleted or missing) becomes null; alt falls back to stepAlt', () => {
    const { howItWorks } = toDetailSections(
      app({
        howItWorks: {
          steps: [
            { title: 'Unpopulated', image: 7 },
            { title: 'No image' },
            { title: 'Populated', image: media(9) },
          ],
        },
      }),
      stepAlt,
    )
    expect(howItWorks?.steps.map((s) => s.image?.alt ?? null)).toEqual([
      null,
      null,
      'alt:2:Populated',
    ])
  })

  it('the data banner needs both title and description', () => {
    expect(
      toDetailSections(app({ dataControl: { title: 'Only title' } }), stepAlt).dataControl,
    ).toBeNull()
    expect(
      toDetailSections(app({ dataControl: { description: 'Only text' } }), stepAlt).dataControl,
    ).toBeNull()
    expect(
      toDetailSections(app({ dataControl: { title: ' T ', description: ' D ' } }), stepAlt)
        .dataControl,
    ).toEqual({ title: 'T', description: 'D' })
  })

  it('accepts a known accent preset and ignores unknown values', () => {
    expect(toDetailSections(app({ accentColor: 'green' }), stepAlt).accent).toBe('green')
    for (const bad of ['nope', '#fff', '', null]) {
      expect(toDetailSections(app({ accentColor: bad }), stepAlt).accent, String(bad)).toBeNull()
    }
  })

  it('features intro keeps only non-blank text', () => {
    expect(
      toDetailSections(app({ featuresIntro: { title: ' Everything ', description: ' ' } }), stepAlt)
        .featuresIntro,
    ).toEqual({ title: 'Everything', description: null })
  })
})

describe('heroPhones', () => {
  const shots = (n: number): ImageSource[] =>
    Array.from({ length: n }, (_, i) => ({
      src: `/s${i + 1}.png`,
      width: 540,
      height: 960,
      alt: `s${i + 1}`,
    }))
  const layout = (n: number) => heroPhones(shots(n)).map((p) => [p.slot, p.image.src])

  it('no screenshots → no phones', () => {
    expect(layout(0)).toEqual([])
  })

  it('one screenshot → centre only', () => {
    expect(layout(1)).toEqual([['center', '/s1.png']])
  })

  it('two screenshots → left shows #2, centre shows #1', () => {
    expect(layout(2)).toEqual([
      ['left', '/s2.png'],
      ['center', '/s1.png'],
    ])
  })

  it('three or more screenshots → left #2, centre #1, right #3 (never more than 3 phones)', () => {
    const expected = [
      ['left', '/s2.png'],
      ['center', '/s1.png'],
      ['right', '/s3.png'],
    ]
    expect(layout(3)).toEqual(expected)
    expect(layout(6)).toEqual(expected)
  })
})
