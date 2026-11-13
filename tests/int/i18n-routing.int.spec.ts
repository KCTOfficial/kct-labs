import { describe, expect, it } from 'vitest'

import { isLocale, localizeHref, stripLocale } from '@/i18n/config'
import { en } from '@/i18n/dictionaries/en'
import { id } from '@/i18n/dictionaries/id'
import { format } from '@/i18n'
import { resolveLocaleRoute } from '@/i18n/routing'

describe('resolveLocaleRoute (proxy)', () => {
  it('rewrites unprefixed paths to the default locale (English)', () => {
    expect(resolveLocaleRoute('/')).toEqual({ type: 'rewrite', pathname: '/en' })
    expect(resolveLocaleRoute('/apps/al-quran-imam')).toEqual({
      type: 'rewrite',
      pathname: '/en/apps/al-quran-imam',
    })
  })

  it('redirects explicit /en URLs to the canonical unprefixed URL', () => {
    expect(resolveLocaleRoute('/en')).toEqual({ type: 'redirect', pathname: '/' })
    expect(resolveLocaleRoute('/en/apps')).toEqual({ type: 'redirect', pathname: '/apps' })
  })

  it('passes /id URLs through untouched', () => {
    expect(resolveLocaleRoute('/id')).toEqual({ type: 'next' })
    expect(resolveLocaleRoute('/id/apps')).toEqual({ type: 'next' })
  })

  it('does not treat look-alike segments as locales', () => {
    expect(resolveLocaleRoute('/idea')).toEqual({ type: 'rewrite', pathname: '/en/idea' })
    expect(resolveLocaleRoute('/english')).toEqual({ type: 'rewrite', pathname: '/en/english' })
  })
})

describe('localizeHref / stripLocale', () => {
  it('prefixes non-default locales only', () => {
    expect(localizeHref('/apps', 'id')).toBe('/id/apps')
    expect(localizeHref('/apps', 'en')).toBe('/apps')
    expect(localizeHref('/', 'id')).toBe('/id')
  })

  it('keeps query strings and hashes', () => {
    expect(localizeHref('/apps?category=finance', 'id')).toBe('/id/apps?category=finance')
    expect(localizeHref('/#contact', 'id')).toBe('/id#contact')
  })

  it('is idempotent and switches between locales', () => {
    expect(localizeHref('/id/apps', 'id')).toBe('/id/apps')
    expect(localizeHref('/id/apps', 'en')).toBe('/apps')
  })

  it('never touches external, mailto or anchor links', () => {
    expect(localizeHref('https://www.kct.co.id', 'id')).toBe('https://www.kct.co.id')
    expect(localizeHref('mailto:team@kct.co.id', 'id')).toBe('mailto:team@kct.co.id')
    expect(localizeHref('//cdn.example.com/x', 'id')).toBe('//cdn.example.com/x')
    expect(localizeHref('#top', 'id')).toBe('#top')
  })

  it('strips locale prefixes', () => {
    expect(stripLocale('/id')).toBe('/')
    expect(stripLocale('/id/apps/x')).toBe('/apps/x')
    expect(stripLocale('/idea')).toBe('/idea')
  })

  it('handles the internal default-locale path seen during SSR (regression: /id/en)', () => {
    expect(stripLocale('/en')).toBe('/')
    expect(stripLocale('/en/apps')).toBe('/apps')
    expect(localizeHref(stripLocale('/en'), 'id')).toBe('/id')
    expect(localizeHref(stripLocale('/en/apps/x'), 'id')).toBe('/id/apps/x')
    expect(stripLocale('/english')).toBe('/english')
  })

  it('validates locales', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('id')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })
})

describe('dictionaries', () => {
  const keysOf = (obj: object, prefix = ''): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object' ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    )

  it('have identical keys in every locale', () => {
    expect(keysOf(id).sort()).toEqual(keysOf(en).sort())
  })

  it('have no empty strings', () => {
    for (const dict of [en, id]) {
      const empty = keysOf(dict).filter(
        (k) =>
          k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], dict) === '',
      )
      expect(empty).toEqual([])
    }
  })

  it('format() fills placeholders and leaves unknown ones visible', () => {
    expect(format('{count} apps', { count: 7 })).toBe('7 apps')
    expect(format('{missing}', {})).toBe('{missing}')
  })
})
