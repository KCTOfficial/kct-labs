import type { Locale } from '@/i18n/config'
import { localeTags } from '@/i18n/config'

import {
  LOGO_PATH,
  ORGANIZATION_NAME,
  ORGANIZATION_URL,
  PLAY_STORE_DEVELOPER_URL,
  SITE_NAME,
} from './constants'
import { absoluteUrl, localizedUrl } from './urls'

type JsonLd = Record<string, unknown>

const ORG_ID = `${absoluteUrl('/')}#organization`
const WEBSITE_ID = `${absoluteUrl('/')}#website`

/** Removes undefined/null/empty-string/empty-array values so the output never contains invalid nodes. */
export const compact = <T extends JsonLd>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
    ),
  ) as T

export const organizationSchema = (contact?: {
  email?: string | null
  phone?: string | null
}): JsonLd =>
  compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: ORGANIZATION_NAME,
    alternateName: 'KCT',
    url: ORGANIZATION_URL,
    logo: absoluteUrl(LOGO_PATH),
    sameAs: [ORGANIZATION_URL, PLAY_STORE_DEVELOPER_URL],
    contactPoint:
      contact?.email || contact?.phone
        ? [
            compact({
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: contact.email ?? undefined,
              telephone: contact.phone ?? undefined,
              areaServed: 'ID',
              availableLanguage: ['en', 'id'],
            }),
          ]
        : undefined,
  })

export const websiteSchema = (locale: Locale, description?: string): JsonLd =>
  compact({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: localizedUrl('/', locale),
    description,
    inLanguage: localeTags[locale],
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${localizedUrl('/apps', locale)}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  })

export const breadcrumbSchema = (items: Array<{ name: string; url: string }>): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
})

/** `WebPage` for plain content pages (e.g. legal documents); part of the site `WebSite`. */
export const webPageSchema = (args: {
  name: string
  url: string
  dateModified?: string | null
  inLanguage: Locale
}): JsonLd =>
  compact({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: args.name,
    url: args.url,
    inLanguage: localeTags[args.inLanguage],
    dateModified: args.dateModified ?? undefined,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORG_ID },
  })

export const itemListSchema = (items: Array<{ name: string; url: string }>): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  numberOfItems: items.length,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: item.url,
  })),
})

const PLATFORM_OS: Record<string, string> = { android: 'ANDROID', ios: 'IOS', web: 'Web' }

/**
 * `MobileApplication` for app detail pages. Only facts stored in the CMS are emitted — no fabricated
 * ratings, prices or download counts (Google penalises misleading structured data).
 */
export const mobileApplicationSchema = (args: {
  name: string
  description?: string
  url: string
  image?: string
  screenshots?: string[]
  category?: string
  platforms?: string[] | null
  installUrl?: string | null
  locale: Locale
  dateModified?: string | null
}): JsonLd =>
  compact({
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: args.name,
    description: args.description,
    url: args.url,
    image: args.image,
    screenshot: args.screenshots,
    applicationSubCategory: args.category,
    applicationCategory: 'MobileApplication',
    operatingSystem: (args.platforms ?? ['android']).map((p) => PLATFORM_OS[p] ?? p).join(', '),
    installUrl: args.installUrl ?? undefined,
    downloadUrl: args.installUrl ?? undefined,
    inLanguage: localeTags[args.locale],
    dateModified: args.dateModified ?? undefined,
    publisher: { '@id': ORG_ID },
    author: { '@id': ORG_ID },
  })

/**
 * Serialises JSON-LD for a `<script>` tag. Escapes characters that could close the script element or
 * break JavaScript parsing, so CMS content can never inject markup.
 */
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g')
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g')

export const serializeJsonLd = (data: JsonLd | JsonLd[]): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029')
