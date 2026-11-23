import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { CLEANUP_TIMEOUT, cleanupLegalData } from '../helpers/cleanupLegalData'

import {
  queryAppLegalDoc,
  queryAppLegalDocs,
  queryPublicLegalDocPaths,
  resolvePrivacyLink,
  type LegalDocLink,
} from '@/utilities/legal/queries'

/** Uses uncached `query…` functions (`unstable_cache` needs a Next request); data is unique and cleaned up. */
let payload: Payload
const suffix = `lq-${Date.now()}`
const ctx = { disableRevalidate: true }
const created = {
  docs: [] as number[],
  types: [] as number[],
  apps: [] as number[],
  cats: [] as number[],
}
const appIds: number[] = []
const typeIds: number[] = []

const MD = '# Doc\n\nBody.\n'

const createApp = async (
  name: string,
  status: 'live' | 'archived',
  categoryId: number,
  mediaId: number,
) => {
  const app = await payload.create({
    collection: 'apps',
    data: {
      name: `${name} ${suffix}`,
      slug: `${name}-${suffix}`,
      tagline: 'T',
      shortDescription: 'S',
      icon: mediaId,
      category: categoryId,
      status,
      platforms: ['android'],
      _status: 'published',
    },
    context: ctx,
  })
  created.apps.push(app.id)
  appIds.push(app.id)
  return app
}

const createDoc = async (app: number, typeIdx: number, extra: Record<string, unknown> = {}) => {
  const doc = await payload.create({
    collection: 'app-documents',
    data: {
      app,
      documentType: typeIds[typeIdx],
      slug: `d${typeIdx}-${suffix}`,
      title: `Title ${typeIdx}`,
      markdown: MD,
      _status: 'published',
      ...extra,
    },
    locale: 'en',
    context: ctx,
  })
  created.docs.push(doc.id)
  return doc
}

describe('legal queries', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const cat = await payload.create({
      collection: 'app-categories',
      data: { title: `Cat ${suffix}`, slug: `cat-${suffix}` },
      context: ctx,
    })
    created.cats.push(cat.id)
    const media = await payload.find({ collection: 'media', limit: 1, depth: 0 })
    if (!media.docs[0]) throw new Error('Seed media first (pnpm seed:kct)')
    await createApp('live', 'live', cat.id, media.docs[0].id)
    await createApp('arch', 'archived', cat.id, media.docs[0].id)
    // sortOrder is deliberately the reverse of creation order.
    const orders = [30, 20, 10, 40]
    for (const [i, sortOrder] of orders.entries()) {
      const t = await payload.create({
        collection: 'document-types',
        data: {
          title: `Type ${i} ${suffix}`,
          slug: `type-${i}-${suffix}`,
          sortOrder,
          icon: 'lock',
        },
        context: ctx,
      })
      created.types.push(t.id)
      typeIds.push(t.id)
    }
  })

  afterAll(
    () =>
      cleanupLegalData(
        payload,
        {
          'app-documents': created.docs,
          apps: created.apps,
          'document-types': created.types,
          'app-categories': created.cats,
        },
        suffix,
      ),
    CLEANUP_TIMEOUT,
  )

  it('lists only published docs sorted by documentType.sortOrder, with hasIndonesian', async () => {
    const [liveId] = appIds
    const d0 = await createDoc(liveId, 0) // sortOrder 30
    await createDoc(liveId, 1) // 20
    await createDoc(liveId, 2, { _status: 'draft' }) // 10, hidden
    const d3 = await createDoc(liveId, 3) // 40
    await payload.update({
      collection: 'app-documents',
      id: d0.id,
      data: { markdown: 'Isi', title: 'Judul' },
      locale: 'id',
      context: ctx,
    })
    // Only the Indonesian title, no Indonesian markdown.
    await payload.update({
      collection: 'app-documents',
      id: d3.id,
      data: { title: 'Judul saja' },
      locale: 'id',
      context: ctx,
    })

    const docs = await queryAppLegalDocs(liveId, 'en')
    expect(docs.map((d) => d.slug)).toEqual([`d1-${suffix}`, `d0-${suffix}`, `d3-${suffix}`])
    expect(docs.map((d) => d.hasIndonesian)).toEqual([false, true, false])
    expect(docs[0]).toMatchObject({ typeSlug: `type-1-${suffix}`, icon: 'lock', title: 'Title 1' })
  })

  it('returns a single doc, hiding drafts unless draft is requested', async () => {
    const [liveId] = appIds
    const slug = `d2-${suffix}`
    expect(await queryAppLegalDoc(liveId, slug, 'en', false)).toBeNull()
    const draft = await queryAppLegalDoc(liveId, slug, 'en', true)
    expect(draft?.slug).toBe(slug)
    const pub = await queryAppLegalDoc(liveId, `d0-${suffix}`, 'id', false)
    expect(pub).toMatchObject({ title: 'Judul', hasIndonesian: true })
    const noId = await queryAppLegalDoc(liveId, `d1-${suffix}`, 'en', false)
    expect(noId?.hasIndonesian).toBe(false)
  })

  it('lists public paths including archived apps flagged archived', async () => {
    const [liveId, archId] = appIds
    await createDoc(archId, 0)
    const paths = (await queryPublicLegalDocPaths()).filter((p) => p.appSlug.endsWith(suffix))
    expect(paths).toHaveLength(4) // 3 published on live + 1 on archived; draft excluded
    expect(paths.filter((p) => p.archived)).toEqual([
      expect.objectContaining({ appSlug: `arch-${suffix}`, docSlug: `d0-${suffix}` }),
    ])
    expect(paths.some((p) => p.docSlug === `d2-${suffix}`)).toBe(false)
    expect(paths.find((p) => p.docSlug === `d0-${suffix}` && !p.archived)?.hasIndonesian).toBe(true)
    expect(liveId).toBeDefined()
  })
})

describe('resolvePrivacyLink', () => {
  const doc = (typeSlug: string, slug = typeSlug): LegalDocLink => ({
    slug,
    title: 'x',
    icon: 'lock',
    typeSlug,
    effectiveDate: null,
    hasIndonesian: false,
  })

  it('prefers the privacy-policy document (internal, localized)', () => {
    expect(
      resolvePrivacyLink(
        [doc('terms'), doc('privacy-policy', 'privacy')],
        'https://x.test/p',
        'app',
        'id',
      ),
    ).toEqual({ href: '/id/apps/app/legal/privacy', external: false })
    expect(resolvePrivacyLink([doc('privacy-policy')], null, 'app', 'en')).toEqual({
      href: '/apps/app/legal/privacy-policy',
      external: false,
    })
  })

  it('falls back to the legacy URL, then null', () => {
    expect(resolvePrivacyLink([doc('terms')], 'https://x.test/p', 'app', 'en')).toEqual({
      href: 'https://x.test/p',
      external: true,
    })
    expect(resolvePrivacyLink([], '', 'app', 'en')).toBeNull()
    expect(resolvePrivacyLink([], undefined, 'app', 'en')).toBeNull()
  })
})
