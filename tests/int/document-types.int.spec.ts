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
    ).rejects.toThrow()
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

  it.todo('rejects deleting a type in use, with the document count (enable after Task 4)')

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
