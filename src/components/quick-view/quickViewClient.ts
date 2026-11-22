import type { Locale } from '@/i18n/config'
import type { QuickViewApp } from '@/utilities/apps/quickView'
import { createTtlLru } from '@/utilities/ttlLru'

/** Client for `GET /next/quick-view` (see src/app/(frontend)/next/quick-view/route.ts). */
export const QUICK_VIEW_ENDPOINT = '/next/quick-view'
export const QUICK_VIEW_TIMEOUT_MS = 6000

export type QuickViewFailure = 'not_found' | 'unavailable' | 'timeout'

export class QuickViewError extends Error {
  constructor(readonly reason: QuickViewFailure) {
    super(reason)
    this.name = 'QuickViewError'
  }
}

// Small, short-lived cache: repeat opens are instant while CMS edits show up within a minute.
const cache = createTtlLru<QuickViewApp>(20, 60_000)
// One network request per app, however many callers (hover prefetch + click) ask at once.
const inflight = new Map<string, Promise<QuickViewApp>>()

const keyOf = (slug: string, locale: Locale) => `${locale}:${slug}`

/** Minimal runtime guard: never render a payload that is not the shape we asked for. */
export const isQuickViewApp = (value: unknown, slug: string): value is QuickViewApp => {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (
    data.slug === slug &&
    typeof data.name === 'string' &&
    typeof data.shortDescription === 'string' &&
    typeof data.statusLabel === 'string' &&
    typeof data.downloadsText === 'string' &&
    Array.isArray(data.screenshots) &&
    Array.isArray(data.features)
  )
}

export const peekQuickView = (slug: string, locale: Locale): QuickViewApp | undefined =>
  cache.get(keyOf(slug, locale))

export const fetchQuickView = (slug: string, locale: Locale): Promise<QuickViewApp> => {
  const key = keyOf(slug, locale)
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)
  const pending = inflight.get(key)
  if (pending) return pending

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), QUICK_VIEW_TIMEOUT_MS)

  const request = fetch(`${QUICK_VIEW_ENDPOINT}?${new URLSearchParams({ slug, locale })}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (response.status === 404) throw new QuickViewError('not_found')
      if (!response.ok) throw new QuickViewError('unavailable')
      const data: unknown = await response.json()
      if (!isQuickViewApp(data, slug)) throw new QuickViewError('unavailable')
      cache.set(key, data)
      return data
    })
    .catch((error: unknown) => {
      if (error instanceof QuickViewError) throw error
      throw new QuickViewError(controller.signal.aborted ? 'timeout' : 'unavailable')
    })
    .finally(() => {
      clearTimeout(timer)
      inflight.delete(key)
    })

  inflight.set(key, request)
  return request
}

/** Fire-and-forget warm-up (hover/focus). Failures are ignored: a real click retries. */
export const prefetchQuickView = (slug: string, locale: Locale): void => {
  if (cache.get(keyOf(slug, locale)) || inflight.has(keyOf(slug, locale))) return
  fetchQuickView(slug, locale).catch(() => undefined)
}
