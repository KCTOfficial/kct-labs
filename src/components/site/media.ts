import type { Media } from '@/payload-types'
import { getMediaUrl } from '@/utilities/getMediaUrl'

export type ImageSource = { src: string; width: number; height: number; alt: string }

export const isMedia = (value: unknown): value is Media =>
  Boolean(value && typeof value === 'object' && 'url' in value && (value as Media).url)

/**
 * Resolves a populated Media doc into props for `next/image`. Returns `null` for unpopulated or
 * missing uploads so callers can render a fallback instead of a broken image.
 */
export const toImageSource = (value: unknown, fallbackAlt: string): ImageSource | null => {
  if (!isMedia(value)) return null
  return {
    src: getMediaUrl(value.url, value.updatedAt),
    width: value.width || 512,
    height: value.height || 512,
    alt: value.alt?.trim() || fallbackAlt,
  }
}

export const firstMedia = (values: unknown[] | null | undefined): Media | null =>
  (values ?? []).find(isMedia) ?? null
