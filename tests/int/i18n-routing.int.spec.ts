import { describe, expect, it } from 'vitest'

import {
  defaultLocale,
  fallbackLocales,
  isLocale,
  localizeHref,
  locales,
  stripLocale,
} from '@/i18n/config'
import { en } from '@/i18n/dictionaries/en'
import { id } from '@/i18n/dictionaries/id'
import { format } from '@/i18n'
import { resolveLocaleRoute } from '@/i18n/routing'

describe('resolveLocaleRoute (proxy)', () => {
  it('/ rewrites to /id', () => {
    expect(resolveLocaleRoute('/')).toEqual({ type: 'rewrite', pathname: '/id' })
  })

  it('/apps rewrites to /id/apps', () => {
    expect(resolveLocaleRoute('/apps')).toEqual({ type: 'rewrite', pathname: '/id/apps' })
    expect(resolveLocaleRoute('/apps/al-quran-imam')).toEqual({
      type: 'rewrite',
      pathname: '/id/apps/al-quran-imam',
    })
  })

  it('/id/apps redirects 308 to /apps and keeps ?sort=name', () => {
    expect(resolveLocaleRoute('/id')).toEqual({ type: 'redirect', pathname: '/' })
    expect(resolveLocaleRoute('/id/apps')).toEqual({ type: 'redirect', pathname: '/apps' })
    // The proxy only replaces `pathname` on a clone of `nextUrl`, so the query string survives.
    const url = new URL('https://hub.kct.co.id/id/apps?sort=name')
    const decision = resolveLocaleRoute(url.pathname)
    expect(decision.type).toBe('redirect')
    if (decision.type === 'redirect') url.pathname = decision.pathname
    expect(url.pathname + url.search).toBe('/apps?sort=name')
  })

  it('/en/apps is served as-is', () => {
    expect(resolveLocaleRoute('/en')).toEqual({ type: 'next' })
    expect(resolveLocaleRoute('/en/apps')).toEqual({ type: 'next' })
  })

  it('/identity and /enter are not treated as locales', () => {
    expect(resolveLocaleRoute('/identity')).toEqual({ type: 'rewrite', pathname: '/id/identity' })
    expect(resolveLocaleRoute('/enter')).toEqual({ type: 'rewrite', pathname: '/id/enter' })
    expect(resolveLocaleRoute('/idea')).toEqual({ type: 'rewrite', pathname: '/id/idea' })
    expect(resolveLocaleRoute('/english')).toEqual({ type: 'rewrite', pathname: '/id/english' })
  })
})

describe('locale config', () => {
  it('defaults to Indonesian; only Indonesian falls back (to English)', () => {
    expect(defaultLocale).toBe('id')
    expect(fallbackLocales).toEqual({ id: 'en' })
  })

  it('keeps the locales order en, id (it is the order of the Postgres `_locales` enum)', () => {
    // Reordering recreates the enum (DROP TYPE/CREATE TYPE) = a schema migration. Put the default
    // locale first explicitly where needed instead of reordering this array.
    expect(locales).toEqual(['en', 'id'])
  })
})

describe('localizeHref / stripLocale', () => {
  it('prefixes non-default locales only', () => {
    expect(localizeHref('/apps', 'id')).toBe('/apps')
    expect(localizeHref('/apps', 'en')).toBe('/en/apps')
    expect(localizeHref('/', 'en')).toBe('/en')
    expect(localizeHref('/', 'id')).toBe('/')
  })

  it('keeps query strings and hashes', () => {
    expect(localizeHref('/apps?category=finance', 'en')).toBe('/en/apps?category=finance')
    expect(localizeHref('/#contact', 'en')).toBe('/en#contact')
    expect(localizeHref('/apps?sort=name', 'id')).toBe('/apps?sort=name')
  })

  it('is idempotent and switches between locales', () => {
    expect(localizeHref('/en/apps', 'en')).toBe('/en/apps')
    expect(localizeHref('/en/apps', 'id')).toBe('/apps')
    expect(localizeHref('/id/apps', 'en')).toBe('/en/apps')
  })

  it('never touches external, mailto or anchor links', () => {
    expect(localizeHref('https://www.kct.co.id', 'en')).toBe('https://www.kct.co.id')
    expect(localizeHref('mailto:team@kct.co.id', 'en')).toBe('mailto:team@kct.co.id')
    expect(localizeHref('//cdn.example.com/x', 'en')).toBe('//cdn.example.com/x')
    expect(localizeHref('#top', 'en')).toBe('#top')
  })

  it('strips locale prefixes', () => {
    expect(stripLocale('/id/apps')).toBe('/apps')
    expect(stripLocale('/en')).toBe('/')
    expect(stripLocale('/en/apps/x')).toBe('/apps/x')
    expect(stripLocale('/idea')).toBe('/idea')
    expect(stripLocale('/identity')).toBe('/identity')
  })

  it('handles the internal default-locale path seen during SSR (regression: /en/id)', () => {
    expect(stripLocale('/id')).toBe('/')
    expect(stripLocale('/id/apps')).toBe('/apps')
    expect(localizeHref(stripLocale('/id'), 'en')).toBe('/en')
    expect(localizeHref(stripLocale('/id/apps/x'), 'en')).toBe('/en/apps/x')
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
