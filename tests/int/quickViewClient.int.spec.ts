import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchQuickView,
  isQuickViewApp,
  peekQuickView,
  prefetchQuickView,
  QuickViewError,
} from '@/components/quick-view/quickViewClient'

const payload = (slug: string, overrides: Record<string, unknown> = {}) => ({
  slug,
  name: 'Name',
  tagline: null,
  shortDescription: 'Short',
  icon: null,
  status: 'live',
  statusLabel: 'LIVE',
  categoryTitle: null,
  downloadsLabel: null,
  downloadsText: 'Just released',
  ageRating: null,
  screenshots: [],
  features: [],
  playStoreUrl: null,
  ...overrides,
})

const ok = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('isQuickViewApp', () => {
  it('accepts the expected shape only for the requested slug', () => {
    expect(isQuickViewApp(payload('a'), 'a')).toBe(true)
    expect(isQuickViewApp(payload('a'), 'b')).toBe(false)
    expect(isQuickViewApp(payload('a', { screenshots: 'x' }), 'a')).toBe(false)
    expect(isQuickViewApp(payload('a', { name: 5 }), 'a')).toBe(false)
    expect(isQuickViewApp(null, 'a')).toBe(false)
    expect(isQuickViewApp('text', 'a')).toBe(false)
    expect(isQuickViewApp({ error: 'not_found' }, 'a')).toBe(false)
  })
})

describe('fetchQuickView', () => {
  it('requests the endpoint with encoded params, returns data and caches it', async () => {
    const fetchMock = vi.fn(() => ok(payload('cache-me')))
    vi.stubGlobal('fetch', fetchMock)

    const first = await fetchQuickView('cache-me', 'id')
    expect(first.slug).toBe('cache-me')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe(
      '/next/quick-view?slug=cache-me&locale=id',
    )

    expect(peekQuickView('cache-me', 'id')).toEqual(first)
    await fetchQuickView('cache-me', 'id')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // A different locale is a different entry.
    expect(peekQuickView('cache-me', 'en')).toBeUndefined()
  })

  it('de-duplicates concurrent requests (hover prefetch + click)', async () => {
    const fetchMock = vi.fn(() => ok(payload('dedupe')))
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([
      fetchQuickView('dedupe', 'en'),
      fetchQuickView('dedupe', 'en'),
    ])
    expect(a).toBe(b)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps 404 to not_found and other statuses/shape errors to unavailable (never cached)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockReturnValueOnce(ok({ error: 'not_found' }, 404))
    await expect(fetchQuickView('gone', 'en')).rejects.toMatchObject({ reason: 'not_found' })

    fetchMock.mockReturnValueOnce(ok({ error: 'unavailable' }, 500))
    await expect(fetchQuickView('boom', 'en')).rejects.toMatchObject({ reason: 'unavailable' })

    fetchMock.mockReturnValueOnce(ok(payload('other-slug')))
    await expect(fetchQuickView('wrong-shape', 'en')).rejects.toBeInstanceOf(QuickViewError)

    fetchMock.mockReturnValueOnce(Promise.reject(new TypeError('network down')))
    await expect(fetchQuickView('offline', 'en')).rejects.toMatchObject({ reason: 'unavailable' })

    expect(peekQuickView('gone', 'en')).toBeUndefined()
    // Failures are not memoized: the next attempt hits the network again.
    fetchMock.mockReturnValueOnce(ok(payload('boom')))
    await expect(fetchQuickView('boom', 'en')).resolves.toMatchObject({ slug: 'boom' })
  })

  it('aborts after the timeout and reports it', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      ),
    )
    const result = fetchQuickView('slow', 'en')
    const assertion = expect(result).rejects.toMatchObject({ reason: 'timeout' })
    await vi.advanceTimersByTimeAsync(6000)
    await assertion
  })

  it('prefetch never throws and warms the cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => ok(payload('warm'))),
    )
    prefetchQuickView('warm', 'en')
    await vi.waitFor(() => expect(peekQuickView('warm', 'en')).toBeDefined())

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('x'))),
    )
    expect(() => prefetchQuickView('cold', 'en')).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(peekQuickView('cold', 'en')).toBeUndefined()
  })
})
