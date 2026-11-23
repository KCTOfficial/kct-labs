import { beforeAll, describe, expect, it } from 'vitest'

import {
  breadcrumbSchema,
  webPageSchema,
  compact,
  mobileApplicationSchema,
  serializeJsonLd,
} from '@/utilities/seo/structuredData'
import { formatDescription, formatTitle, truncate } from '@/utilities/seo/text'
import {
  absoluteUrl,
  buildAlternates,
  buildSingleLanguageAlternates,
  localizedUrl,
} from '@/utilities/seo/urls'
import { localizedSitemapEntries, singleLocaleSitemapEntry } from '@/utilities/seo/sitemap'
import { legalSitemapEntries } from '@/utilities/legal/sitemap'
import { stripLocalizedFlags } from '@/utilities/withoutLocalization'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SERVER_URL = 'https://hub.kct.co.id'
})

describe('titles and descriptions', () => {
  it('appends the site name once and stays within 60 characters', () => {
    expect(formatTitle('Al Quran Imam')).toBe('Al Quran Imam | KCT Hub')
    expect(formatTitle('KCT Hub — Apps')).toBe('KCT Hub — Apps')
    expect(formatTitle('')).toBe('KCT Hub')
    expect(formatTitle('x '.repeat(80)).length).toBeLessThanOrEqual(60)
  })

  it('uses the first non-empty description and caps it at 160 characters', () => {
    expect(formatDescription(null, '  ', 'Fallback')).toBe('Fallback')
    expect(formatDescription('word '.repeat(60))!.length).toBeLessThanOrEqual(160)
    expect(formatDescription(undefined)).toBeUndefined()
    expect(truncate('Hello world foo bar', 12)).toBe('Hello world…')
  })
})

describe('canonical + hreflang', () => {
  it('builds absolute, locale-aware URLs', () => {
    expect(absoluteUrl('/')).toBe('https://hub.kct.co.id/')
    expect(localizedUrl('/apps', 'id')).toBe('https://hub.kct.co.id/id/apps')
    expect(localizedUrl('/apps', 'en')).toBe('https://hub.kct.co.id/apps')
  })

  it('lists every locale plus x-default', () => {
    const alt = buildAlternates('/apps/al-quran-imam', 'id')
    expect(alt.canonical).toBe('https://hub.kct.co.id/id/apps/al-quran-imam')
    expect(alt.languages).toEqual({
      en: 'https://hub.kct.co.id/apps/al-quran-imam',
      id: 'https://hub.kct.co.id/id/apps/al-quran-imam',
      'x-default': 'https://hub.kct.co.id/apps/al-quran-imam',
    })
  })

  it('gives untranslated template pages a single default-locale canonical', () => {
    expect(buildSingleLanguageAlternates('/posts')).toEqual({
      canonical: 'https://hub.kct.co.id/posts',
    })
  })

  it('emits one sitemap entry per locale with hreflang alternates', () => {
    const entries = localizedSitemapEntries('/apps', '2026-01-01T00:00:00.000Z')
    expect(entries.map((e) => e.loc)).toEqual([
      'https://hub.kct.co.id/apps',
      'https://hub.kct.co.id/id/apps',
    ])
    expect(entries[0].alternateRefs?.map((r) => r.hreflang)).toEqual(['en', 'id', 'x-default'])
  })
})

describe('JSON-LD', () => {
  it('escapes characters that could break out of the <script> element', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script> &  ' })
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
    expect(out).not.toContain(' ')
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script> &  ')
  })

  it('drops empty values instead of emitting invalid nodes', () => {
    expect(compact({ a: 1, b: undefined, c: '', d: [], e: null, f: 'x' })).toEqual({ a: 1, f: 'x' })
  })

  it('never invents ratings, offers or download counts', () => {
    const schema = mobileApplicationSchema({
      name: 'Jejak Uang',
      url: 'https://hub.kct.co.id/apps/jejak-uang',
      locale: 'en',
      platforms: ['android'],
      installUrl: 'https://play.google.com/store/apps/details?id=id.jejakuang.app',
    })
    expect(schema['@type']).toBe('MobileApplication')
    expect(schema.operatingSystem).toBe('ANDROID')
    expect(schema).not.toHaveProperty('aggregateRating')
    expect(schema).not.toHaveProperty('offers')
    expect(schema).not.toHaveProperty('description')
  })

  it('numbers breadcrumb items from 1', () => {
    const list = breadcrumbSchema([
      { name: 'Home', url: 'a' },
      { name: 'Apps', url: 'b' },
    ]) as { itemListElement: Array<{ position: number }> }
    expect(list.itemListElement.map((i) => i.position)).toEqual([1, 2])
  })

  it('builds a WebPage without empty fields', () => {
    const page = webPageSchema({ name: 'Privacy', url: 'https://x/p', inLanguage: 'id' })
    expect(page).toMatchObject({ '@type': 'WebPage', name: 'Privacy', inLanguage: 'id' })
    expect(page).not.toHaveProperty('dateModified')
    expect(
      webPageSchema({ name: 'P', url: 'u', inLanguage: 'en', dateModified: '2026-01-01' }),
    ).toHaveProperty('dateModified', '2026-01-01')
  })
})

describe('withoutLocalization (backward compatibility)', () => {
  it('turns off localized flags recursively, including tabs, groups and blocks', () => {
    const fields = stripLocalizedFlags([
      { name: 'a', type: 'text', localized: true },
      {
        type: 'tabs',
        tabs: [{ label: 'T', fields: [{ name: 'b', type: 'text', localized: true }] }],
      },
      { name: 'g', type: 'group', fields: [{ name: 'c', type: 'textarea', localized: true }] },
      {
        name: 'bl',
        type: 'blocks',
        blocks: [{ slug: 'x', fields: [{ name: 'd', type: 'text', localized: true }] }],
      },
    ])
    expect(JSON.stringify(fields)).not.toContain('"localized":true')
  })
})

describe('legal documents in the sitemap', () => {
  const doc = (
    appSlug: string,
    docSlug: string,
    updatedAt: string,
    hasIndonesian = false,
    archived = false,
  ) => ({ appSlug, docSlug, updatedAt, hasIndonesian, archived })

  it('singleLocaleSitemapEntry emits one EN entry without an id alternate', () => {
    const entry = singleLocaleSitemapEntry('/apps/a/legal', '2026-01-01T00:00:00.000Z')
    expect(entry.loc).toBe('https://hub.kct.co.id/apps/a/legal')
    expect(JSON.stringify(entry)).not.toContain('/id/')
  })

  it('a document with Indonesian content gets both locales with alternates', () => {
    const entries = legalSitemapEntries([doc('a', 'privacy', '2026-02-01T00:00:00.000Z', true)])
    const locs = entries.map((e) => e.loc)
    expect(locs).toContain('https://hub.kct.co.id/apps/a/legal/privacy')
    expect(locs).toContain('https://hub.kct.co.id/id/apps/a/legal/privacy')
    const docEntry = entries.find((e) => e.loc === 'https://hub.kct.co.id/apps/a/legal/privacy')
    expect(docEntry?.alternateRefs?.map((r) => r.hreflang)).toEqual(['en', 'id', 'x-default'])
    expect(docEntry?.lastmod).toBe('2026-02-01T00:00:00.000Z')
  })

  it('a document without Indonesian content gets a single EN entry', () => {
    const locs = legalSitemapEntries([doc('a', 'terms', '2026-02-01T00:00:00.000Z')]).map(
      (e) => e.loc,
    )
    expect(locs).toContain('https://hub.kct.co.id/apps/a/legal/terms')
    expect(locs).not.toContain('https://hub.kct.co.id/id/apps/a/legal/terms')
  })

  it('excludes archived apps entirely', () => {
    expect(legalSitemapEntries([doc('a', 'privacy', '2026-02-01', true, true)])).toEqual([])
  })

  it('adds the app index once, localized if any doc is translated, with the latest lastmod', () => {
    const entries = legalSitemapEntries([
      doc('a', 'privacy', '2026-02-01T00:00:00.000Z'),
      doc('a', 'terms', '2026-03-01T00:00:00.000Z', true),
      doc('b', 'privacy', '2026-01-01T00:00:00.000Z'),
    ])
    const index = entries.filter((e) => e.loc?.endsWith('/apps/a/legal'))
    expect(index).toHaveLength(2)
    expect(index.every((e) => e.lastmod === '2026-03-01T00:00:00.000Z')).toBe(true)
    expect(entries.filter((e) => e.loc?.endsWith('/apps/b/legal'))).toHaveLength(1)
    expect(entries.some((e) => e.loc === 'https://hub.kct.co.id/id/apps/b/legal')).toBe(false)
  })

  it('returns nothing for an empty list', () => {
    expect(legalSitemapEntries([])).toEqual([])
  })
})
