import { describe, expect, it } from 'vitest'

import { listingHref, parseListingParams } from '@/components/apps/listingParams'
import { pageWindow } from '@/components/apps/ListingPagination'
import { normalizePage, normalizeSearch, SEARCH_MAX_LENGTH } from '@/utilities/apps/params'
import {
  isHttpsUrl,
  isPlayStoreUrl,
  isSafeHref,
  isValidDownloadsLabel,
  isValidPackageId,
  isValidPhone,
  optionalText,
  parseDownloads,
  toWhatsAppNumber,
} from '@/utilities/apps/validation'

describe('app field validation', () => {
  it('accepts real Android package IDs and rejects invalid ones', () => {
    for (const ok of ['com.kct.quranx', 'co.id.kct.games.aksarago', 'id.jejakuang.app']) {
      expect(isValidPackageId(ok)).toBe(true)
    }
    for (const bad of [
      'com',
      'com..kct',
      '1com.kct',
      'com.kct.',
      'com kct.app',
      `a.${'b'.repeat(200)}`,
    ]) {
      expect(isValidPackageId(bad)).toBe(false)
    }
  })

  it('only accepts https Google Play URLs for the store link', () => {
    expect(isPlayStoreUrl('https://play.google.com/store/apps/details?id=com.kct.quranx')).toBe(
      true,
    )
    expect(isPlayStoreUrl('http://play.google.com/store')).toBe(false)
    expect(isPlayStoreUrl('https://play.google.com.evil.com/x')).toBe(false)
    expect(isPlayStoreUrl('javascript:alert(1)')).toBe(false)
    expect(isPlayStoreUrl('not a url')).toBe(false)
  })

  it('rejects dangerous hrefs', () => {
    expect(isSafeHref('/apps')).toBe(true)
    expect(isSafeHref('https://www.kct.co.id')).toBe(true)
    expect(isSafeHref('mailto:team@kct.co.id')).toBe(true)
    expect(isSafeHref('javascript:alert(1)')).toBe(false)
    expect(isSafeHref('//evil.com')).toBe(false)
    expect(isSafeHref('http://insecure.com')).toBe(false)
    expect(isHttpsUrl('https://x.com')).toBe(true)
  })

  it('validates phone numbers and builds wa.me numbers', () => {
    expect(isValidPhone('081223344939')).toBe(true)
    expect(isValidPhone('021 2922 2999')).toBe(true)
    expect(isValidPhone('abc')).toBe(false)
    expect(toWhatsAppNumber('0812-2334-4939')).toBe('6281223344939')
    expect(toWhatsAppNumber('+62 812 2334 4939')).toBe('6281223344939')
  })

  it('optionalText ignores empty values and reports invalid ones', () => {
    const validate = optionalText(isHttpsUrl, 'bad')
    expect(validate('')).toBe(true)
    expect(validate(null)).toBe(true)
    expect(validate('https://ok.com')).toBe(true)
    expect(validate('ftp://x')).toBe('bad')
    expect(validate(42)).toBe('bad')
  })
})

describe('parseDownloads', () => {
  it('parses Play Store labels', () => {
    expect(parseDownloads('100+')).toBe(100)
    expect(parseDownloads('1,000+')).toBe(1000)
    expect(parseDownloads('10K+')).toBe(10_000)
    expect(parseDownloads('5M+')).toBe(5_000_000)
  })

  it('treats empty, zero and invalid values as "just released"', () => {
    for (const v of [null, undefined, '', '0+', '0', 'many', '+100'])
      expect(parseDownloads(v)).toBeNull()
    expect(isValidDownloadsLabel('100+')).toBe(true)
    expect(isValidDownloadsLabel('lots')).toBe(false)
  })
})

describe('listing params', () => {
  it('falls back to safe defaults for untrusted input', () => {
    expect(
      parseListingParams({ q: '  quran  ', category: 'Finance', sort: 'drop table', page: '-3' }),
    ).toEqual({
      q: 'quran',
      category: 'finance',
      sort: 'featured',
      page: 1,
    })
    expect(parseListingParams({ category: '../etc', page: '2abc' })).toMatchObject({
      category: '',
      page: 1,
    })
    expect(parseListingParams({ q: ['a', 'b'], sort: 'name', page: '3' })).toMatchObject({
      q: 'a',
      sort: 'name',
      page: 3,
    })
  })

  it('caps search length and page numbers', () => {
    expect(normalizeSearch('x'.repeat(500))).toHaveLength(SEARCH_MAX_LENGTH)
    expect(normalizePage('999999')).toBe(1)
    expect(normalizePage('0')).toBe(1)
  })

  it('builds short canonical-friendly URLs', () => {
    expect(listingHref('/apps', {})).toBe('/apps')
    expect(listingHref('/apps', { sort: 'featured', page: 1 })).toBe('/apps')
    expect(listingHref('/id/apps', { category: 'finance', sort: 'name', page: 2, q: 'a b' })).toBe(
      '/id/apps?q=a+b&category=finance&sort=name&page=2',
    )
  })

  it('computes a compact pagination window', () => {
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10])
    expect(pageWindow(10, 10)).toEqual([1, null, 9, 10])
  })
})
