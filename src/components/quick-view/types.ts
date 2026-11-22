import type { QuickViewApp } from '@/utilities/apps/quickView'

/** Static UI strings for the popup. Built on the server from the dictionary (client has none). */
export type QuickViewLabels = {
  close: string
  loading: string
  error: string
  retry: string
  viewFullDetails: string
  getOnGooglePlay: string
  screenshots: string
  highlights: string
  ageRating: string
}

export type QuickViewView =
  | { status: 'loading'; slug: string; href: string }
  | { status: 'ready'; slug: string; href: string; app: QuickViewApp }
  | { status: 'error'; slug: string; href: string }

/**
 * `open` drives the native <dialog>; `view` is kept after closing so the content stays rendered
 * while the exit animation plays.
 */
export type QuickViewState = { open: boolean; view: QuickViewView | null }
