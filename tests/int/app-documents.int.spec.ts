import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { CLEANUP_TIMEOUT, cleanupLegalData } from '../helpers/cleanupLegalData'

import { MARKDOWN_MAX_BYTES } from '@/utilities/legal/validation'

/**
 * Runs against the configured DATABASE_URL with uniquely-named documents that are deleted
 * afterwards; existing content is never touched.
 */
let payload: Payload
const suffix = `adoc-${Date.now()}`
const ctx = { disableRevalidate: true }
const created = {
  docs: [] as number[],
  types: [] as number[],
  apps: [] as number[],
  categories: [] as number[],
  redirects: [] as number[],
}
let appId: number
const typeIds: number[] = []

const MARKDOWN = '# Privacy Policy\n\n## Data we collect\n\nNothing.\n'

const createDoc = async (overrides: Record<string, unknown> = {}, typeIndex = 0) => {
  const doc = await payload.create({
    collection: 'app-documents',
    data: {
      app: appId,
      documentType: typeIds[typeIndex],
      slug: `doc-${typeIndex}-${suffix}`,
      title: 'Privacy Policy',
      markdown: MARKDOWN,
      _status: 'published',
      ...overrides,
    },
    locale: 'en',
    context: ctx,
  })
  created.docs.push(doc.id)
  return doc
}

describe('AppDocuments collection', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const category = await payload.create({
      collection: 'app-categories',
      data: { title: `Doc Category ${suffix}`, slug: `doc-category-${suffix}` },
      context: ctx,
    })
    created.categories.push(category.id)
    const media = await payload.find({ collection: 'media', limit: 1, depth: 0 })
    if (!media.docs[0]) throw new Error('Seed media first (pnpm seed:kct)')
    const app = await payload.create({
      collection: 'apps',
      data: {
        name: `Doc App ${suffix}`,
        slug: `doc-app-${suffix}`,
        tagline: 'Tagline',
        shortDescription: 'Short',
        icon: media.docs[0].id,
        category: category.id,
        status: 'live',
        platforms: ['android'],
        _status: 'published',
      },
      context: ctx,
    })
    created.apps.push(app.id)
    appId = app.id
    for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']) {
      const type = await payload.create({
        collection: 'document-types',
        data: { title: `Doc Type ${name} ${suffix}`, slug: `doc-type-${name}-${suffix}` },
        context: ctx,
      })
      created.types.push(type.id)
      typeIds.push(type.id)
    }
  })

  afterAll(
    () =>
      cleanupLegalData(
        payload,
        {
          redirects: created.redirects,
          'app-documents': created.docs,
          apps: created.apps,
          'document-types': created.types,
          'app-categories': created.categories,
        },
        suffix,
      ),
    CLEANUP_TIMEOUT,
  )

  it('converts markdown to lexical content on create', async () => {
    const doc = await createDoc({}, 0)
    const json = JSON.stringify(doc.content)
    expect(json).toContain('"type":"heading"')
    expect(json).toContain('Data we collect')
  })

  it('rejects a second document with the same app and slug', async () => {
    await createDoc({ slug: `same-slug-${suffix}` }, 1)
    await expect(createDoc({ slug: `same-slug-${suffix}` }, 2)).rejects.toThrow()
  })

  it('rejects a second document with the same app and document type', async () => {
    await createDoc({ slug: `type-x-${suffix}` }, 3)
    await expect(createDoc({ slug: `type-y-${suffix}` }, 3)).rejects.toThrow()
  })

  it('hides drafts from anonymous reads', async () => {
    const draft = await createDoc({ _status: 'draft', slug: `draft-${suffix}` }, 4)
    const res = await payload.find({
      collection: 'app-documents',
      where: { id: { equals: draft.id } },
      overrideAccess: false,
    })
    expect(res.totalDocs).toBe(0)
  })

  it('stamps effectiveDate only when markdown changes on publish', async () => {
    const doc = await createDoc({ effectiveDate: '2020-01-01T00:00:00.000Z' }, 5)
    const unchanged = await payload.update({
      collection: 'app-documents',
      id: doc.id,
      data: { title: 'Renamed', _status: 'published' },
      locale: 'en',
      context: ctx,
    })
    expect(unchanged.effectiveDate).toBe('2020-01-01T00:00:00.000Z')

    const changed = await payload.update({
      collection: 'app-documents',
      id: doc.id,
      data: { markdown: `${MARKDOWN}\nMore.\n`, _status: 'published' },
      locale: 'en',
      context: ctx,
    })
    expect(changed.effectiveDate?.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10))

    const manual = await payload.update({
      collection: 'app-documents',
      id: doc.id,
      data: {
        markdown: `${MARKDOWN}\nEven more.\n`,
        effectiveDate: '2021-06-01T00:00:00.000Z',
        _status: 'published',
      },
      locale: 'en',
      context: ctx,
    })
    expect(manual.effectiveDate).toBe('2021-06-01T00:00:00.000Z')
  })

  it('creates EN and ID redirects when a published slug changes', async () => {
    const doc = await createDoc({ slug: `old-${suffix}` }, 6)
    await payload.update({
      collection: 'app-documents',
      id: doc.id,
      data: { slug: `new-${suffix}` },
      locale: 'en',
      context: ctx,
    })
    const appSlug = `doc-app-${suffix}`
    const res = await payload.find({
      collection: 'redirects',
      where: { from: { like: `/legal/old-${suffix}` } },
      limit: 10,
    })
    created.redirects.push(...res.docs.map((r) => r.id))
    const byFrom = Object.fromEntries(res.docs.map((r) => [r.from, r.to]))
    expect(res.totalDocs).toBe(2)
    expect(byFrom[`/apps/${appSlug}/legal/old-${suffix}`]).toMatchObject({
      type: 'custom',
      url: `/apps/${appSlug}/legal/new-${suffix}`,
    })
    expect(byFrom[`/en/apps/${appSlug}/legal/old-${suffix}`]).toMatchObject({
      type: 'custom',
      url: `/en/apps/${appSlug}/legal/new-${suffix}`,
    })
  })

  it('rejects markdown larger than 512 KB', async () => {
    await expect(
      createDoc({ slug: `huge-${suffix}`, markdown: 'a'.repeat(MARKDOWN_MAX_BYTES + 1) }, 7),
    ).rejects.toMatchObject({
      data: { errors: [expect.objectContaining({ message: expect.stringMatching(/too large/i) })] },
    })
  })

  it('validates markdown per locale when saving all locales at once', async () => {
    const target = await createDoc({ slug: `all-locales-${suffix}` }, 11)
    const ok = await payload.update({
      collection: 'app-documents',
      id: target.id,
      data: { markdown: { id: MARKDOWN, en: '' } } as never,
      locale: 'all' as never, // supported at runtime; the generated type omits 'all'
      context: ctx,
    })
    expect(ok.id).toBe(target.id)
    await expect(
      payload.update({
        collection: 'app-documents',
        id: target.id,
        data: { markdown: { id: MARKDOWN, en: 'a'.repeat(MARKDOWN_MAX_BYTES + 1) } } as never,
        locale: 'all' as never, // supported at runtime; the generated type omits 'all'
        context: ctx,
      }),
    ).rejects.toMatchObject({
      data: { errors: [expect.objectContaining({ message: expect.stringMatching(/too large/i) })] },
    })
  })

  it('duplicates as a draft with a -copy slug and an empty app', async () => {
    const doc = await createDoc({ slug: `dup-${suffix}` }, 7)
    const copy = await payload.duplicate({
      collection: 'app-documents',
      id: doc.id,
      draft: true,
      context: ctx,
    })
    created.docs.push(copy.id)
    expect(copy._status).toBe('draft')
    expect(copy.slug).toBe(`dup-${suffix}-copy`)
    expect(copy.app ?? null).toBeNull()

    await expect(
      payload.update({
        collection: 'app-documents',
        id: copy.id,
        data: { _status: 'published' },
        context: ctx,
      }),
    ).rejects.toThrow()
  })

  describe('draft saved before publish (autosave flow)', () => {
    const today = () => new Date().toISOString().slice(0, 10)

    const saveDraft = (id: number, data: Record<string, unknown>) =>
      payload.update({
        collection: 'app-documents',
        id,
        data: { ...data, _status: 'draft' },
        draft: true,
        locale: 'en',
        context: ctx,
      })

    const publish = (id: number) =>
      payload.update({
        collection: 'app-documents',
        id,
        data: { _status: 'published' },
        locale: 'en',
        context: ctx,
      })

    it('stamps effectiveDate when the draft changed markdown', async () => {
      const doc = await createDoc(
        { slug: `draft-md-${suffix}`, effectiveDate: '2020-01-01T00:00:00.000Z' },
        8,
      )
      await saveDraft(doc.id, {
        markdown: `${MARKDOWN}
Draft change.
`,
      })
      const published = await publish(doc.id)
      expect(published.effectiveDate?.slice(0, 10)).toBe(today())
    })

    it('creates EN and ID redirects when the draft changed the slug', async () => {
      const doc = await createDoc({ slug: `draft-old-${suffix}` }, 9)
      await saveDraft(doc.id, { slug: `draft-new-${suffix}` })
      await publish(doc.id)
      const res = await payload.find({
        collection: 'redirects',
        where: { from: { like: `/legal/draft-old-${suffix}` } },
        limit: 10,
      })
      created.redirects.push(...res.docs.map((r) => r.id))
      expect(res.totalDocs).toBe(2)
      expect(res.docs.every((r) => r.to?.type === 'custom')).toBe(true)
      expect(res.docs.map((r) => r.to?.url).sort()).toEqual([
        `/apps/doc-app-${suffix}/legal/draft-new-${suffix}`,
        `/en/apps/doc-app-${suffix}/legal/draft-new-${suffix}`,
      ])
    })

    it('keeps a manual effectiveDate set in the draft', async () => {
      const doc = await createDoc(
        { slug: `draft-date-${suffix}`, effectiveDate: '2020-01-01T00:00:00.000Z' },
        10,
      )
      await saveDraft(doc.id, {
        markdown: `${MARKDOWN}
Another change.
`,
        effectiveDate: '2022-03-04T00:00:00.000Z',
      })
      const published = await publish(doc.id)
      expect(published.effectiveDate).toBe('2022-03-04T00:00:00.000Z')
    })
  })
})
