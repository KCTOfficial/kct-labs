import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Runs against the configured DATABASE_URL. Creates its own uniquely-named documents and deletes
 * them afterwards; existing content is never touched.
 */
let payload: Payload
const suffix = `test-${Date.now()}`
const created: { apps: number[]; categories: number[] } = { apps: [], categories: [] }
let iconId: number

const baseApp = (overrides: Record<string, unknown> = {}) => ({
  name: `Test App ${suffix}`,
  slug: `test-app-${suffix}`,
  tagline: 'Tagline EN',
  shortDescription: 'Short EN',
  icon: iconId,
  category: created.categories[0],
  status: 'live' as const,
  platforms: ['android' as const],
  ...overrides,
})

describe('Apps collection', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const category = await payload.create({
      collection: 'app-categories',
      data: { title: `Test Category ${suffix}`, slug: `test-category-${suffix}` },
      context: { disableRevalidate: true },
    })
    created.categories.push(category.id)
    const media = await payload.find({ collection: 'media', limit: 1, depth: 0 })
    if (!media.docs[0]) throw new Error('Seed media first (pnpm seed:kct)')
    iconId = media.docs[0].id
  })

  afterAll(async () => {
    for (const id of created.apps) {
      await payload.delete({ collection: 'apps', id, context: { disableRevalidate: true } })
    }
    for (const id of created.categories) {
      await payload.delete({
        collection: 'app-categories',
        id,
        context: { disableRevalidate: true },
      })
    }
  })

  it('hides drafts from public (access-controlled) reads', async () => {
    const draft = await payload.create({
      collection: 'apps',
      data: baseApp({ _status: 'draft', slug: `draft-${suffix}` }),
      draft: true,
      context: { disableRevalidate: true },
    })
    created.apps.push(draft.id)

    const publicRead = await payload.find({
      collection: 'apps',
      overrideAccess: false,
      where: { slug: { equals: `draft-${suffix}` } },
    })
    expect(publicRead.totalDocs).toBe(0)
  })

  it('rejects invalid store URLs and package IDs', async () => {
    await expect(
      payload.create({
        collection: 'apps',
        data: baseApp({ slug: `bad-url-${suffix}`, playStoreUrl: 'https://evil.example.com/app' }),
        context: { disableRevalidate: true },
      }),
    ).rejects.toThrow()

    await expect(
      payload.create({
        collection: 'apps',
        data: baseApp({ slug: `bad-pkg-${suffix}`, packageId: 'not a package' }),
        context: { disableRevalidate: true },
      }),
    ).rejects.toThrow()
  })

  it('stores translations per locale and falls back to English', async () => {
    const app = await payload.create({
      collection: 'apps',
      data: baseApp({ _status: 'published', slug: `i18n-${suffix}` }),
      locale: 'en',
      context: { disableRevalidate: true },
    })
    created.apps.push(app.id)

    const idBefore = await payload.findByID({ collection: 'apps', id: app.id, locale: 'id' })
    expect(idBefore.tagline).toBe('Tagline EN') // fallback

    // Indonesian is the default locale: an EN-only document needs every required ID field.
    await expect(
      payload.update({
        collection: 'apps',
        id: app.id,
        locale: 'id',
        data: { tagline: 'Tagline ID' },
        context: { disableRevalidate: true },
      }),
    ).rejects.toThrow()

    await payload.update({
      collection: 'apps',
      id: app.id,
      locale: 'id',
      data: { tagline: 'Tagline ID', shortDescription: 'Short ID' },
      context: { disableRevalidate: true },
    })
    const [enDoc, idDoc] = await Promise.all([
      payload.findByID({ collection: 'apps', id: app.id, locale: 'en' }),
      payload.findByID({ collection: 'apps', id: app.id, locale: 'id' }),
    ])
    expect(enDoc.tagline).toBe('Tagline EN')
    expect(idDoc.tagline).toBe('Tagline ID')
    expect(idDoc.name).toBe(enDoc.name) // product name is not localized
  })

  it('id empty field falls back to en per field', async () => {
    const app = await payload.create({
      collection: 'apps',
      data: baseApp({
        _status: 'published',
        slug: `mixed-${suffix}`,
        tagline: 'Tagline ID',
        shortDescription: 'Short ID',
      }),
      // No locale: the default (Indonesian) is used.
      context: { disableRevalidate: true },
    })
    created.apps.push(app.id)
    await payload.update({
      collection: 'apps',
      id: app.id,
      locale: 'en',
      data: {
        tagline: 'Tagline EN',
        shortDescription: 'Short EN',
        features: [{ label: 'Feature EN' }],
      },
      context: { disableRevalidate: true },
    })

    const idDoc = await payload.findByID({ collection: 'apps', id: app.id, locale: 'id' })
    expect(idDoc.tagline).toBe('Tagline ID') // own value wins
    expect(idDoc.shortDescription).toBe('Short ID')
    expect(idDoc.features?.map((f) => f.label)).toEqual(['Feature EN']) // empty in ID → EN
  })

  it('en does not fall back to id', async () => {
    const app = await payload.create({
      collection: 'apps',
      data: baseApp({
        _status: 'published',
        slug: `id-only-${suffix}`,
        tagline: 'Tagline ID',
        shortDescription: 'Short ID',
      }),
      locale: 'id',
      context: { disableRevalidate: true },
    })
    created.apps.push(app.id)

    const enDoc = await payload.findByID({ collection: 'apps', id: app.id, locale: 'en' })
    expect(enDoc.tagline ?? null).toBeNull()
    expect(enDoc.shortDescription ?? null).toBeNull()
  })
})
