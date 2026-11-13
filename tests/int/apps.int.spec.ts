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

    await payload.update({
      collection: 'apps',
      id: app.id,
      locale: 'id',
      data: { tagline: 'Tagline ID' },
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
})
