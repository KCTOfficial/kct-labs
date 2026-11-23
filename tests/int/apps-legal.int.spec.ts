import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { legalDocPath } from '@/utilities/legal/paths'

/**
 * Runs against the configured DATABASE_URL with uniquely-named documents that are deleted
 * afterwards; existing content is never touched.
 */
let payload: Payload
const suffix = `legal-${Date.now()}`
const ctx = { disableRevalidate: true }
const created = { apps: [] as number[], types: [] as number[], categories: [] as number[] }
let categoryId: number
let mediaId: number
const typeIds: number[] = []

const createApp = async (name: string) => {
  const app = await payload.create({
    collection: 'apps',
    data: {
      name: `Legal App ${name} ${suffix}`,
      slug: `legal-app-${name}-${suffix}`,
      tagline: 'Tagline',
      shortDescription: 'Short',
      icon: mediaId,
      category: categoryId,
      status: 'live',
      platforms: ['android'],
      _status: 'published',
    },
    context: ctx,
  })
  created.apps.push(app.id)
  return app
}

const createDoc = (appId: number, typeIndex: number, status: 'draft' | 'published') =>
  payload.create({
    collection: 'app-documents',
    data: {
      app: appId,
      documentType: typeIds[typeIndex],
      slug: `doc-${typeIndex}`,
      title: 'Privacy Policy',
      markdown: '# Policy\n\nText.\n',
      _status: status,
    },
    locale: 'en',
    context: ctx,
  })

const renameSlug = (id: number, slug: string, extra: Record<string, unknown> = {}) =>
  payload.update({ collection: 'apps', id, data: { slug, ...extra }, context: ctx })

describe('Apps legal integration', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const category = await payload.create({
      collection: 'app-categories',
      data: { title: `Legal Category ${suffix}`, slug: `legal-category-${suffix}` },
      context: ctx,
    })
    created.categories.push(category.id)
    categoryId = category.id
    const media = await payload.find({ collection: 'media', limit: 1, depth: 0 })
    if (!media.docs[0]) throw new Error('Seed media first (pnpm seed:kct)')
    mediaId = media.docs[0].id
    for (const name of ['a', 'b']) {
      const type = await payload.create({
        collection: 'document-types',
        data: { title: `Legal Type ${name} ${suffix}`, slug: `legal-type-${name}-${suffix}` },
        context: ctx,
      })
      created.types.push(type.id)
      typeIds.push(type.id)
    }
  })

  afterAll(async () => {
    for (const id of created.apps) {
      await payload.delete({ collection: 'apps', id, context: ctx }).catch(() => {})
    }
    for (const id of created.types) {
      await payload.delete({ collection: 'document-types', id, context: ctx }).catch(() => {})
    }
    for (const id of created.categories) {
      await payload.delete({ collection: 'app-categories', id, context: ctx }).catch(() => {})
    }
  })

  it('deletes the documents and their redirects together with the app', async () => {
    const app = await createApp('cascade')
    await createDoc(app.id, 0, 'published')
    await createDoc(app.id, 1, 'draft')
    const redirect = await payload.create({
      collection: 'redirects',
      data: {
        from: legalDocPath(app.slug, 'old'),
        to: { type: 'custom', url: legalDocPath(app.slug, 'doc-0') },
      },
      context: ctx,
    })

    await payload.delete({ collection: 'apps', id: app.id, context: ctx })

    const docs = await payload.find({
      collection: 'app-documents',
      where: { app: { equals: app.id } },
      draft: true,
    })
    expect(docs.totalDocs).toBe(0)
    const redirects = await payload.find({
      collection: 'redirects',
      where: { id: { equals: redirect.id } },
    })
    expect(redirects.totalDocs).toBe(0)
  })

  it('rejects a slug change while published documents exist, unless confirmed', async () => {
    const app = await createApp('locked')
    await createDoc(app.id, 0, 'published')

    await expect(renameSlug(app.id, `legal-app-locked-2-${suffix}`)).rejects.toThrow(/slug/i)

    const renamed = await renameSlug(app.id, `legal-app-locked-3-${suffix}`, {
      confirmSlugChange: true,
    })
    expect(renamed.slug).toBe(`legal-app-locked-3-${suffix}`)
  })

  it('keeps an auto-generated slug when the app is renamed while published documents exist', async () => {
    // Mirrors an admin autosave draft: no slug yet, so `generateSlug` stays on.
    const app = await payload.create({
      collection: 'apps',
      data: { name: `Legal App Generated ${suffix}`, _status: 'draft' },
      draft: true,
      context: ctx,
    })
    created.apps.push(app.id)
    const named = await payload.update({
      collection: 'apps',
      id: app.id,
      data: { name: `Legal App Generated ${suffix}`, generateSlug: true },
      draft: true,
      context: ctx,
    })
    expect(named.slug).toBeTruthy()
    await createDoc(app.id, 0, 'published')

    const renamed = await payload.update({
      collection: 'apps',
      id: app.id,
      data: { name: `Legal App Renamed ${suffix}`, generateSlug: true },
      draft: true,
      context: ctx,
    })
    expect(renamed.slug).toBe(named.slug)
  })

  it('allows a slug change when the app has no published documents', async () => {
    const app = await createApp('free')
    await createDoc(app.id, 0, 'draft')
    const renamed = await renameSlug(app.id, `legal-app-free-2-${suffix}`)
    expect(renamed.slug).toBe(`legal-app-free-2-${suffix}`)
  })

  it('exposes the documents through the legalDocuments join', async () => {
    const app = await createApp('join')
    const doc = await createDoc(app.id, 0, 'published')
    const found = await payload.findByID({
      collection: 'apps',
      id: app.id,
      joins: { legalDocuments: { limit: 10 } },
    })
    const docs = (found as unknown as { legalDocuments?: { docs?: unknown[] } }).legalDocuments
      ?.docs
    expect(docs?.map((d) => (typeof d === 'object' ? (d as { id: number }).id : d))).toContain(
      doc.id,
    )
  })
})
