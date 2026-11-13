import { beforeAll, describe, expect, it } from 'vitest'

import {
  breadcrumbSchema,
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
import { localizedSitemapEntries } from '@/utilities/seo/sitemap'
import { stripLocalizedFlags } from '@/utilities/withoutLocalization'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SERVER_URL = 'https://labs.kct.co.id'
})

describe('titles and descriptions', () => {
  it('appends the site name once and stays within 60 characters', () => {
    expect(formatTitle('Al Quran Imam')).toBe('Al Quran Imam | KCT Labs')
    expect(formatTitle('KCT Labs — Apps')).toBe('KCT Labs — Apps')
    expect(formatTitle('')).toBe('KCT Labs')
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
    expect(absoluteUrl('/')).toBe('https://labs.kct.co.id/')
    expect(localizedUrl('/apps', 'id')).toBe('https://labs.kct.co.id/id/apps')
    expect(localizedUrl('/apps', 'en')).toBe('https://labs.kct.co.id/apps')
  })

  it('lists every locale plus x-default', () => {
    const alt = buildAlternates('/apps/al-quran-imam', 'id')
    expect(alt.canonical).toBe('https://labs.kct.co.id/id/apps/al-quran-imam')
    expect(alt.languages).toEqual({
      en: 'https://labs.kct.co.id/apps/al-quran-imam',
      id: 'https://labs.kct.co.id/id/apps/al-quran-imam',
      'x-default': 'https://labs.kct.co.id/apps/al-quran-imam',
    })
  })

  it('gives untranslated template pages a single default-locale canonical', () => {
    expect(buildSingleLanguageAlternates('/posts')).toEqual({
      canonical: 'https://labs.kct.co.id/posts',
    })
  })

  it('emits one sitemap entry per locale with hreflang alternates', () => {
    const entries = localizedSitemapEntries('/apps', '2026-01-01T00:00:00.000Z')
    expect(entries.map((e) => e.loc)).toEqual([
      'https://labs.kct.co.id/apps',
      'https://labs.kct.co.id/id/apps',
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
      url: 'https://labs.kct.co.id/apps/jejak-uang',
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
