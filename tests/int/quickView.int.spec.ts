import { describe, expect, it } from 'vitest'

import { getDictionary } from '@/i18n'
import type { App, AppCategory, Media } from '@/payload-types'
import {
  QUICK_VIEW_MAX_FEATURES,
  QUICK_VIEW_MAX_SCREENSHOTS,
  toQuickView,
} from '@/utilities/apps/quickView'

const en = getDictionary('en')
const id = getDictionary('id')

const media = (n: number, overrides: Partial<Media> = {}): Media =>
  ({
    id: n,
    url: `/api/media/file/shot-${n}.png`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    width: 1080,
    height: 1920,
    alt: '',
    ...overrides,
  }) as Media

const category = { id: 1, title: '  Education ', slug: 'education' } as AppCategory

const makeApp = (overrides: Partial<App> = {}): App =>
  ({
    id: 7,
    name: 'Al Quran Imam',
    slug: 'al-quran-imam',
    tagline: '  Read   the Quran,\n anywhere ',
    shortDescription: 'A calm   reader',
    icon: media(100, { width: 512, height: 512, alt: 'Icon alt' }),
    category,
    status: 'live',
    platforms: ['android'],
    downloadsLabel: '1,000+',
    ageRating: ' 3+ ',
    screenshots: [media(1), media(2)],
    features: [{ label: ' Offline mode ' }, { label: 'Bookmarks' }],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.kct.quranx',
    ...overrides,
  }) as App

describe('toQuickView', () => {
  it('maps a full app to the slim popup payload (trimmed, no rich text, no internal ids)', () => {
    const view = toQuickView(makeApp(), en)
    expect(view).toEqual({
      slug: 'al-quran-imam',
      name: 'Al Quran Imam',
      tagline: 'Read the Quran, anywhere',
      shortDescription: 'A calm reader',
      icon: {
        src: '/api/media/file/shot-100.png?2026-01-01T00%3A00%3A00.000Z',
        width: 512,
        height: 512,
        alt: 'Icon alt',
      },
      status: 'live',
      statusLabel: 'LIVE',
      categoryTitle: 'Education',
      downloadsText: '1,000+ downloads',
      ageRating: '3+',
      screenshots: [
        expect.objectContaining({ alt: 'Al Quran Imam screenshot 1', width: 1080, height: 1920 }),
        expect.objectContaining({ alt: 'Al Quran Imam screenshot 2' }),
      ],
      features: ['Offline mode', 'Bookmarks'],
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.kct.quranx',
    })
    expect(Object.keys(view ?? {})).not.toContain('description')
    expect(Object.keys(view ?? {})).not.toContain('id')
  })

  it('returns null for archived apps so the client falls back to normal navigation', () => {
    expect(toQuickView(makeApp({ status: 'archived' }), en)).toBeNull()
  })

  it('caps screenshots and features and skips unpopulated or empty entries', () => {
    const view = toQuickView(
      makeApp({
        screenshots: [
          1,
          2,
          ...Array.from({ length: 10 }, (_, i) => media(i + 10)),
        ] as App['screenshots'],
        features: [
          { label: '' },
          { label: '   ' },
          { label: null },
          ...Array.from({ length: 9 }, (_, i) => ({ label: `Feature ${i + 1}` })),
        ],
      }),
      en,
    )
    expect(view?.screenshots).toHaveLength(QUICK_VIEW_MAX_SCREENSHOTS)
    expect(view?.screenshots.every((s) => s.src.includes('/api/media/file/'))).toBe(true)
    expect(view?.features).toHaveLength(QUICK_VIEW_MAX_FEATURES)
    expect(view?.features[0]).toBe('Feature 1')
  })

  it('derives the same status as AppCard: live without downloads reads as new', () => {
    expect(toQuickView(makeApp({ status: 'live', downloadsLabel: null }), en)).toMatchObject({
      status: 'new',
      statusLabel: 'NEW',
      downloadsText: 'Just released',
    })
    expect(toQuickView(makeApp({ status: 'live', downloadsLabel: '0+' }), en)?.status).toBe('new')
    expect(toQuickView(makeApp({ status: 'live', downloadsLabel: '100+' }), en)?.status).toBe(
      'live',
    )
    expect(toQuickView(makeApp({ status: 'beta', downloadsLabel: null }), en)?.status).toBe('beta')
    expect(toQuickView(makeApp({ status: 'new' }), en)?.status).toBe('new')
  })

  it('drops invalid downloads labels and non-Play-Store URLs', () => {
    expect(toQuickView(makeApp({ downloadsLabel: 'lots!' }), en)?.downloadsText).toBe(
      'Just released',
    )
    for (const url of [
      'http://play.google.com/store/apps/details?id=a.b',
      'https://evil.example.com/store/apps/details?id=a.b',
      'javascript:alert(1)',
      'not a url',
      '',
    ]) {
      expect(toQuickView(makeApp({ playStoreUrl: url }), en)?.playStoreUrl).toBeNull()
    }
    expect(toQuickView(makeApp({ playStoreUrl: null }), en)?.playStoreUrl).toBeNull()
  })

  it('tolerates missing or unpopulated relations and optional fields', () => {
    const view = toQuickView(
      makeApp({
        icon: 5,
        category: 3,
        tagline: undefined,
        shortDescription: undefined,
        ageRating: undefined,
        screenshots: undefined,
        features: undefined,
      }),
      en,
    )
    expect(view).toMatchObject({
      icon: null,
      categoryTitle: null,
      tagline: null,
      shortDescription: '',
      ageRating: null,
      screenshots: [],
      features: [],
    })
  })

  it('localizes generated alt text and is JSON-serializable (safe for the endpoint)', () => {
    const view = toQuickView(makeApp({ icon: media(100, { alt: '' }) }), id)
    expect(view?.icon?.alt).toBe('Ikon aplikasi Al Quran Imam')
    expect(view?.screenshots[0]?.alt).toBe('Tangkapan layar Al Quran Imam 1')
    expect(view?.downloadsText).toBe('1,000+ unduhan')
    expect(view?.statusLabel).toBe('LIVE')
    expect(JSON.parse(JSON.stringify(view))).toEqual(view)
  })
})
