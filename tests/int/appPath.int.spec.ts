import { describe, expect, it } from 'vitest'

import {
  isAppDetailPath,
  isValidSlug,
  parseAppDetailPath,
  SLUG_MAX_LENGTH,
} from '@/utilities/apps/appPath'

describe('isValidSlug', () => {
  it('accepts lowercase kebab-case slugs', () => {
    for (const slug of [
      'al-quran-imam',
      'a',
      'a1',
      'koorva',
      'game-2048',
      'a'.repeat(SLUG_MAX_LENGTH),
    ]) {
      expect(isValidSlug(slug)).toBe(true)
    }
  })

  it('rejects anything else, including traversal, encoding, case and overlong input', () => {
    for (const slug of [
      '',
      '-a',
      'a-',
      'a--b',
      'A',
      'Al-Quran',
      '../etc',
      'a/b',
      'a b',
      '%2e%2e',
      'a_b',
      'ä',
      'a'.repeat(SLUG_MAX_LENGTH + 1),
    ]) {
      expect(isValidSlug(slug)).toBe(false)
    }
    for (const value of [undefined, null, 5, {}, ['a']]) expect(isValidSlug(value)).toBe(false)
  })
})

describe('parseAppDetailPath', () => {
  it('parses English (unprefixed), Indonesian and legacy /en detail URLs', () => {
    expect(parseAppDetailPath('/apps/al-quran-imam')).toEqual({
      slug: 'al-quran-imam',
      locale: 'en',
    })
    expect(parseAppDetailPath('/id/apps/al-quran-imam')).toEqual({
      slug: 'al-quran-imam',
      locale: 'id',
    })
    expect(parseAppDetailPath('/en/apps/al-quran-imam')).toEqual({
      slug: 'al-quran-imam',
      locale: 'en',
    })
  })

  it('ignores trailing slashes', () => {
    expect(parseAppDetailPath('/apps/koorva/')).toEqual({ slug: 'koorva', locale: 'en' })
    expect(parseAppDetailPath('/id/apps/koorva/')).toEqual({ slug: 'koorva', locale: 'id' })
  })

  it('returns null for everything that is not an app detail route', () => {
    for (const path of [
      '',
      '/',
      '/id',
      '/apps',
      '/id/apps',
      '/apps/x/y',
      '/id/apps/x/y',
      '/fr/apps/x',
      '/posts/x',
      '/id/posts/x',
      '/apps/Uppercase',
      '/apps/%20x',
      '/apps/..',
      '/apps/a b',
      '/apps-sitemap.xml',
      '/admin/collections/apps',
    ]) {
      expect(parseAppDetailPath(path)).toBeNull()
    }
  })

  it('isAppDetailPath mirrors the parser', () => {
    expect(isAppDetailPath('/apps/koorva')).toBe(true)
    expect(isAppDetailPath('/apps')).toBe(false)
  })
})
