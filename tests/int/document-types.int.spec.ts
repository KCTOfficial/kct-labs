import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let payload: Payload
const suffix = `test-${Date.now()}`
const ctx = { disableRevalidate: true }
const created: number[] = []

const createType = async (name: string) => {
  const doc = await payload.create({
    collection: 'document-types',
    data: { title: `Type ${name} ${suffix}`, slug: `type-${name}-${suffix}` },
    context: ctx,
  })
  created.push(doc.id)
  return doc
}

describe('DocumentTypes collection', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'document-types', id, context: ctx }).catch(() => {})
    }
  })

  it('creates a type with defaults', async () => {
    const doc = await createType('a')
    expect(doc.slug).toBe(`type-a-${suffix}`)
    expect(doc.icon).toBe('file-text')
    expect(doc.sortOrder).toBe(0)
  })

  it('rejects changing the slug on update', async () => {
    const doc = await createType('b')
    await expect(
      payload.update({
        collection: 'document-types',
        id: doc.id,
        data: { slug: `changed-${suffix}` },
        context: ctx,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('slug'),
    })
  })

  it('allows updating other fields with the same slug', async () => {
    const doc = await createType('c')
    const updated = await payload.update({
      collection: 'document-types',
      id: doc.id,
      data: { slug: doc.slug, sortOrder: 5 },
      context: ctx,
    })
    expect(updated.sortOrder).toBe(5)
  })

  it('deletes an unused type', async () => {
    const doc = await createType('d')
    await payload.delete({ collection: 'document-types', id: doc.id, context: ctx })
    const found = await payload.find({
      collection: 'document-types',
      where: { id: { equals: doc.id } },
    })
    expect(found.totalDocs).toBe(0)
  })

  it('rejects deleting a type in use, with the document count', async () => {
    const type = await createType('used')
    const category = await payload.create({
      collection: 'app-categories',
      data: { title: `Used Category ${suffix}`, slug: `used-category-${suffix}` },
      context: ctx,
    })
    const media = await payload.find({ collection: 'media', limit: 1, depth: 0 })
    if (!media.docs[0]) throw new Error('Seed media first (pnpm seed:kct)')
    const app = await payload.create({
      collection: 'apps',
      data: {
        name: `Used App ${suffix}`,
        slug: `used-app-${suffix}`,
        tagline: 'Tagline',
        shortDescription: 'Short',
        icon: media.docs[0].id,
        category: category.id,
        status: 'live',
        platforms: ['android'],
      },
      context: ctx,
    })
    const doc = await payload.create({
      collection: 'app-documents',
      data: {
        app: app.id,
        documentType: type.id,
        slug: `used-doc-${suffix}`,
        title: 'Used',
        markdown: '# Used',
      },
      context: ctx,
    })
    try {
      await expect(
        payload.delete({ collection: 'document-types', id: type.id, context: ctx }),
      ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('1 document') })
    } finally {
      await payload.delete({ collection: 'app-documents', id: doc.id, context: ctx })
      await payload.delete({ collection: 'apps', id: app.id, context: ctx })
      await payload.delete({ collection: 'app-categories', id: category.id, context: ctx })
    }
  })

  it('lets anonymous users find types', async () => {
    const doc = await createType('e')
    const res = await payload.find({
      collection: 'document-types',
      where: { id: { equals: doc.id } },
      overrideAccess: false,
    })
    expect(res.totalDocs).toBe(1)
  })
})
