import type { Metadata } from 'next'

import type { App, Config, Media, Page, Post } from '../payload-types'

import { defaultLocale, locales, ogLocales, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n'
import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'
import { DEFAULT_OG_IMAGE_PATH } from './seo/constants'
import { formatDescription, formatTitle } from './seo/text'
import { buildAlternates, buildSingleLanguageAlternates, type Alternates } from './seo/urls'

type OgImage = { url: string; width?: number; height?: number; alt?: string }

const getOgImage = (
  image?: Media | Config['db']['defaultIDType'] | null,
  fallbackAlt?: string,
): OgImage => {
  const serverUrl = getServerSideURL()

  if (image && typeof image === 'object' && 'url' in image && image.url) {
    const og = image.sizes?.og
    if (og?.url) {
      return {
        url: serverUrl + og.url,
        width: og.width ?? 1200,
        height: og.height ?? 630,
        alt: image.alt || fallbackAlt,
      }
    }
    return {
      url: serverUrl + image.url,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      alt: image.alt || fallbackAlt,
    }
  }

  return { url: serverUrl + DEFAULT_OG_IMAGE_PATH, width: 1200, height: 630, alt: fallbackAlt }
}

type MetaDoc = Partial<Page> | Partial<Post> | Partial<App>

export type GenerateMetaArgs = {
  doc: MetaDoc | null
  /** Site path without locale prefix, e.g. `/apps/al-quran-imam`. Enables canonical + hreflang. */
  path?: string
  locale?: Locale
  /** `true` when the document is translated in every locale (adds hreflang alternates). */
  translated?: boolean
  fallbackTitle?: string
  fallbackDescription?: string
  fallbackImage?: Media | number | null
  noIndex?: boolean
  ogType?: 'website' | 'article'
}

const docTitle = (doc: MetaDoc | null): string | undefined => {
  if (!doc) return undefined
  if ('name' in doc && doc.name) return doc.name
  if ('title' in doc && doc.title) return doc.title
  return undefined
}

/**
 * Builds Next.js metadata for a CMS document. Backward compatible: `generateMeta({ doc })` still works
 * for template Pages/Posts; passing `path`/`locale` adds canonical, hreflang and og:locale.
 */
export const generateMeta = async (args: GenerateMetaArgs): Promise<Metadata> => {
  const {
    doc,
    path,
    locale = defaultLocale,
    translated = false,
    fallbackTitle,
    fallbackDescription,
    fallbackImage,
    noIndex,
    ogType = 'website',
  } = args
  const dict = getDictionary(locale)

  const title = formatTitle(doc?.meta?.title || docTitle(doc) || fallbackTitle)
  const description = formatDescription(
    doc?.meta?.description,
    fallbackDescription,
    dict.meta.defaultDescription,
  )
  const image = getOgImage(doc?.meta?.image ?? fallbackImage, docTitle(doc) || fallbackTitle)

  let alternates: Alternates | undefined
  if (path)
    alternates = translated ? buildAlternates(path, locale) : buildSingleLanguageAlternates(path)

  const ogLocale = translated ? ogLocales[locale] : ogLocales[defaultLocale]

  return {
    title: { absolute: title },
    description,
    alternates,
    openGraph: mergeOpenGraph({
      type: ogType,
      title,
      description: description || '',
      images: [image],
      url: alternates?.canonical ?? (Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/'),
      locale: ogLocale,
      alternateLocale: translated
        ? locales.filter((l) => l !== locale).map((l) => ogLocales[l])
        : undefined,
    }),
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  }
}
