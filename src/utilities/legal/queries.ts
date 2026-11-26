import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload, type Where } from 'payload'

import { localizeHref, locales, type Locale } from '@/i18n/config'
import type { App, AppDocument, DocumentType } from '@/payload-types'
import { APPS_CACHE_TAG } from '@/utilities/apps/cacheTags'

import { APP_DOCUMENTS_CACHE_TAG, PRIVACY_POLICY_TYPE_SLUG, type LegalIcon } from './constants'
import { legalFallbackLocales } from './contentLocales'
import { legalDocPath } from './paths'

export type LegalDocLink = {
  slug: string
  title: string
  icon: LegalIcon
  typeSlug: string
  effectiveDate: string | null
  /** Locales with the document's own markdown (no fallback), in config order. */
  contentLocales: Locale[]
}

export type PublicLegalDocPath = {
  appSlug: string
  docSlug: string
  updatedAt: string
  contentLocales: Locale[]
  archived: boolean
}

const DEFAULT_ICON: LegalIcon = 'file-text'
const CACHE_TAGS = [APP_DOCUMENTS_CACHE_TAG, APPS_CACHE_TAG]

const getPayloadClient = () => getPayload({ config: configPromise })

/** Relations are populated with only the fields needed here (keeps `depth: 1` payloads small). */
const populate = {
  'document-types': { title: true, slug: true, icon: true, sortOrder: true },
  apps: { slug: true, status: true },
} as const

const hasOwnContentWhere: Where = {
  and: [{ markdown: { exists: true } }, { markdown: { not_equals: '' } }],
}

/** One query: ids of the (published) documents that have markdown of their own in `locale`. */
const findIdsWithOwnContent = async (where: Where, locale: Locale): Promise<Set<number>> => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'app-documents',
    depth: 0,
    draft: false,
    fallbackLocale: false,
    locale,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
    where: { and: [where, hasOwnContentWhere] },
  })
  return new Set(result.docs.map((d) => d.id))
}

/** One probe per locale (not per document): `contentLocales` for every matching document. */
const findContentLocales = async (where: Where): Promise<(id: number) => Locale[]> => {
  const idsByLocale = await Promise.all(
    locales.map(async (locale) => [locale, await findIdsWithOwnContent(where, locale)] as const),
  )
  return (id) => idsByLocale.filter(([, ids]) => ids.has(id)).map(([locale]) => locale)
}

const populatedType = (doc: Pick<AppDocument, 'documentType'>): DocumentType | null =>
  typeof doc.documentType === 'object' ? doc.documentType : null

const bySortOrder = (a: DocumentType | null, b: DocumentType | null) =>
  (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0)

export const queryAppLegalDocs = async (appId: number, locale: Locale): Promise<LegalDocLink[]> => {
  const payload = await getPayloadClient()
  const where: Where = { app: { equals: appId } }
  const [result, contentLocalesOf] = await Promise.all([
    payload.find({
      collection: 'app-documents',
      depth: 1,
      draft: false,
      // Legal text is shown in another language (flagged) rather than left empty.
      fallbackLocale: legalFallbackLocales(locale),
      locale,
      overrideAccess: false,
      pagination: false,
      populate,
      select: { slug: true, title: true, documentType: true, effectiveDate: true },
      where,
    }),
    findContentLocales(where),
  ])

  return result.docs
    .map((doc) => ({ doc, type: populatedType(doc) }))
    .filter((entry): entry is { doc: (typeof result.docs)[number]; type: DocumentType } =>
      Boolean(entry.type),
    )
    .sort((a, b) => bySortOrder(a.type, b.type) || a.type.slug.localeCompare(b.type.slug))
    .map(({ doc, type }) => ({
      slug: doc.slug,
      // Falls back to the type title if the document has none in either locale.
      title: doc.title || type.title || type.slug,
      icon: type.icon ?? DEFAULT_ICON,
      typeSlug: type.slug,
      effectiveDate: doc.effectiveDate ?? null,
      contentLocales: contentLocalesOf(doc.id),
    }))
}

export const getAppLegalDocs = unstable_cache(queryAppLegalDocs, ['app-legal-docs'], {
  tags: CACHE_TAGS,
})

export type AppLegalDoc = AppDocument & { contentLocales: Locale[] }

export const queryAppLegalDoc = async (
  appId: number,
  slug: string,
  locale: Locale,
  draft: boolean,
): Promise<AppLegalDoc | null> => {
  const payload = await getPayloadClient()
  const where: Where = { and: [{ app: { equals: appId } }, { slug: { equals: slug } }] }
  const result = await payload.find({
    collection: 'app-documents',
    depth: 1,
    draft,
    fallbackLocale: legalFallbackLocales(locale),
    limit: 1,
    locale,
    overrideAccess: draft,
    pagination: false,
    where,
  })
  const doc = result.docs[0]
  if (!doc) return null
  const contentLocalesOf = await findContentLocales({ id: { equals: doc.id } })
  return { ...doc, contentLocales: contentLocalesOf(doc.id) }
}

const cachedAppLegalDoc = unstable_cache(
  async (appId: number, slug: string, locale: Locale) =>
    queryAppLegalDoc(appId, slug, locale, false),
  ['app-legal-doc'],
  { tags: CACHE_TAGS },
)

export const getAppLegalDoc = (appId: number, slug: string, locale: Locale, draft: boolean) =>
  draft ? queryAppLegalDoc(appId, slug, locale, true) : cachedAppLegalDoc(appId, slug, locale)

/**
 * Every published document, including those of archived apps (pages stay reachable; callers
 * mark them noindex and leave them out of the sitemap via `archived`).
 */
export const queryPublicLegalDocPaths = async (): Promise<PublicLegalDocPath[]> => {
  const payload = await getPayloadClient()
  const [result, contentLocalesOf] = await Promise.all([
    payload.find({
      collection: 'app-documents',
      depth: 1,
      draft: false,
      overrideAccess: false,
      pagination: false,
      populate,
      select: { slug: true, app: true, updatedAt: true },
    }),
    findContentLocales({ id: { exists: true } }),
  ])

  return result.docs.flatMap((doc) => {
    const app: Pick<App, 'slug' | 'status'> | null = typeof doc.app === 'object' ? doc.app : null
    if (!app?.slug || !doc.slug) return []
    return [
      {
        appSlug: app.slug,
        docSlug: doc.slug,
        updatedAt: doc.updatedAt,
        contentLocales: contentLocalesOf(doc.id),
        archived: app.status === 'archived',
      },
    ]
  })
}

export const getPublicLegalDocPaths = unstable_cache(
  queryPublicLegalDocPaths,
  ['public-legal-doc-paths'],
  { tags: CACHE_TAGS },
)

/** Internal privacy-policy document first, then the legacy app URL, otherwise nothing. */
export const resolvePrivacyLink = (
  docs: LegalDocLink[],
  legacyUrl: string | null | undefined,
  appSlug: string,
  locale: Locale,
): { href: string; external: boolean } | null => {
  const privacy = docs.find((d) => d.typeSlug === PRIVACY_POLICY_TYPE_SLUG)
  if (privacy) {
    return { href: localizeHref(legalDocPath(appSlug, privacy.slug), locale), external: false }
  }
  if (legacyUrl) return { href: legacyUrl, external: true }
  return null
}
