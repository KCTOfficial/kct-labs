import type { ImageSource } from '@/components/site/media'
import { isMedia, toImageSource } from '@/components/site/media'
import { format, type Dictionary } from '@/i18n'
import type { App } from '@/payload-types'

import { isPlayStoreUrl, parseDownloads } from './validation'

/** Quick-view payload limits: the popup is a teaser, the full page stays the source of truth. */
export const QUICK_VIEW_MAX_SCREENSHOTS = 4
export const QUICK_VIEW_MAX_FEATURES = 4

/** Slim, JSON-serializable view of an app for the popup. No rich text, no internal ids. */
export type QuickViewApp = {
  slug: string
  name: string
  tagline: string | null
  shortDescription: string
  icon: ImageSource | null
  status: App['status']
  /** Localized status text, e.g. `LIVE` / `BARU` (computed server-side: the client has no dictionary). */
  statusLabel: string
  categoryTitle: string | null
  /** Localized downloads text, e.g. `1,000+ downloads` or `Just released`. */
  downloadsText: string
  ageRating: string | null
  screenshots: ImageSource[]
  features: string[]
  playStoreUrl: string | null
}

const clean = (value: string | null | undefined): string | null => {
  const text = value?.replace(/\s+/g, ' ').trim()
  return text ? text : null
}

/**
 * Maps a (cached, populated) app document to the popup payload. Pure.
 * Returns `null` for archived apps: they stay reachable by URL on the full page (noindex) but must
 * not be promoted by the popup, so the client falls back to normal navigation.
 */
export const toQuickView = (app: App, dict: Pick<Dictionary, 'app'>): QuickViewApp | null => {
  if (app.status === 'archived') return null

  const downloadsLabel =
    parseDownloads(app.downloadsLabel) !== null ? clean(app.downloadsLabel) : null

  // Same derivation as AppCard / the detail page: "live" without downloads reads as "new".
  const status: App['status'] =
    app.status === 'live' && downloadsLabel === null ? 'new' : app.status

  const screenshots = (app.screenshots ?? [])
    .filter(isMedia)
    .slice(0, QUICK_VIEW_MAX_SCREENSHOTS)
    .map((media, index) =>
      toImageSource(media, format(dict.app.screenshotAlt, { name: app.name, index: index + 1 })),
    )
    .filter((image): image is ImageSource => image !== null)

  const features = (app.features ?? [])
    .map((feature) => clean(feature.label))
    .filter((label): label is string => label !== null)
    .slice(0, QUICK_VIEW_MAX_FEATURES)

  return {
    slug: app.slug,
    name: app.name,
    tagline: clean(app.tagline),
    shortDescription: clean(app.shortDescription) ?? '',
    icon: toImageSource(app.icon, format(dict.app.iconAlt, { name: app.name })),
    status,
    statusLabel: dict.app.status[status],
    categoryTitle:
      typeof app.category === 'object' && app.category ? clean(app.category.title) : null,
    downloadsText:
      downloadsLabel !== null
        ? format(dict.app.downloads, { count: downloadsLabel })
        : dict.app.justReleased,
    ageRating: clean(app.ageRating),
    screenshots,
    features,
    playStoreUrl: app.playStoreUrl && isPlayStoreUrl(app.playStoreUrl) ? app.playStoreUrl : null,
  }
}
