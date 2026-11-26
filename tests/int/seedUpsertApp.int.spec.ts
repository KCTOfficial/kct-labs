import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { upsertApp } from '@/endpoints/seed/kct'
import {
  seedAppAccents,
  seedApps,
  seedFeatureIcons,
  type SeedApp,
} from '@/endpoints/seed/kct/content'
import config from '@/payload.config'

/**
 * The seed's app upsert against the configured DATABASE_URL, with ONE synthetic app of its own (unique
 * slug and package id, removed afterwards): nothing else in the database is read for writing or touched.
 */
let payload: Payload
const suffix = Date.now().toString(36)
const noRevalidate = { disableRevalidate: true }
const base = seedApps.find((a) => a.slug === 'jejak-uang')!
const app: SeedApp = {
  ...base,
  slug: `seed-test-${suffix}`,
  name: `Seed Test ${suffix}`,
  packageId: `com.kct.seedtest${suffix}`,
}
let categoryId: number
let mediaId: number
let appId: number

const read = (locale: 'en' | 'id') =>
  payload.findByID({ collection: 'apps', id: appId, locale, fallbackLocale: false, depth: 0 })

const run = () => upsertApp(payload, app, { icon: mediaId, screenshots: [], categoryId })

describe('seed upsertApp (page sections)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const category = await payload.create({
      collection: 'app-categories',
      data: { title: `Seed Test Category ${suffix}`, slug: `seed-test-category-${suffix}` },
      context: noRevalidate,
    })
    categoryId = category.id
    const media = await payload.find({ collection: 'media', limit: 1, depth: 0 })
    if (!media.docs[0]) throw new Error('Seed media first (pnpm seed:kct)')
    mediaId = media.docs[0].id
    // The seed data is keyed by slug: register the synthetic app like a real one.
    seedAppAccents[app.slug] = 'green'
    seedFeatureIcons[app.slug] = ['banknote', 'wallet', 'pie-chart']
  })

  afterAll(async () => {
    delete seedAppAccents[app.slug]
    delete seedFeatureIcons[app.slug]
    if (appId) await payload.delete({ collection: 'apps', id: appId, context: noRevalidate })
    await payload.delete({ collection: 'app-categories', id: categoryId, context: noRevalidate })
  })

  it('first run: icons, highlights from feature labels and the accent colour, in both locales', async () => {
    appId = await run()
    const [en, id] = await Promise.all([read('en'), read('id')])
    expect(en.accentColor).toBe('green')
    expect(en.features?.map((f) => f.icon)).toEqual(['banknote', 'wallet', 'pie-chart'])
    expect(en.features?.map((f) => f.label)).toEqual(app.features.en)
    expect(id.features?.map((f) => f.label)).toEqual(app.features.id)
    expect(en.highlights?.map((h) => [h.icon, h.title])).toEqual([
      ['banknote', app.features.en[0]],
      ['wallet', app.features.en[1]],
      ['pie-chart', app.features.en[2]],
    ])
    expect(id.highlights?.map((h) => h.title)).toEqual(app.features.id.slice(0, 3))
    // No new product text is invented: nothing for the sections that need real copy.
    expect(en.howItWorks?.steps ?? []).toEqual([])
    expect(en.dataControl?.title ?? null).toBeNull()
    expect(en.featuresIntro?.title ?? null).toBeNull()
  })

  it('once an editor changed the features, a re-run leaves them, the highlights and the accent alone', async () => {
    // The editor changes things in the admin (per locale, as the admin does).
    const en = await read('en')
    await payload.update({
      collection: 'apps',
      id: appId,
      locale: 'en',
      context: noRevalidate,
      data: {
        accentColor: 'red',
        features: en.features!.map((f, i) =>
          i === 0 ? { ...f, label: 'Edited label', icon: 'camera', description: 'Editor EN' } : f,
        ),
        highlights: en.highlights!.map((h, i) =>
          i === 0 ? { ...h, title: 'Editor highlight' } : h,
        ),
      },
    })
    // The admin always holds the latest state: read the Indonesian rows after the English edit.
    const id = await read('id')
    await payload.update({
      collection: 'apps',
      id: appId,
      locale: 'id',
      context: noRevalidate,
      data: {
        features: id.features!.map((f, i) => (i === 0 ? { ...f, description: 'Editor ID' } : f)),
      },
    })

    await run()

    const [en2, id2] = await Promise.all([read('en'), read('id')])
    expect(en2.accentColor).toBe('red') // not reset to the seed's green
    expect(en2.features?.[0]).toMatchObject({
      label: 'Edited label', // the features are the editor's now: not even the label is re-applied
      icon: 'camera',
      description: 'Editor EN',
    })
    expect(id2.features?.[0]).toMatchObject({ icon: 'camera', description: 'Editor ID' })
    expect(en2.highlights?.[0]?.title).toBe('Editor highlight')
    expect(en2.highlights).toHaveLength(3)
  })

  it('is idempotent: running it again changes no row counts', async () => {
    await run()
    await run()
    const [en, id] = await Promise.all([read('en'), read('id')])
    expect(en.features).toHaveLength(3)
    expect(id.features).toHaveLength(3)
    expect(en.highlights).toHaveLength(3)
    expect(id.highlights).toHaveLength(3)
    expect(en.features?.[0]?.description).toBe('Editor EN')
  })

  it('a feature row added by an editor is never dropped by a re-run', async () => {
    // Indonesian is the default locale, so the admin makes the editor fill the row's ID label.
    const id = await read('id')
    await payload.update({
      collection: 'apps',
      id: appId,
      locale: 'id',
      context: noRevalidate,
      data: {
        features: [...id.features!, { label: 'Extra ID', icon: 'star', description: 'Extra text' }],
      },
    })
    await run()
    const [en2, id2] = await Promise.all([read('en'), read('id')])
    expect(id2.features).toHaveLength(4)
    expect(id2.features?.[3]).toMatchObject({
      label: 'Extra ID',
      icon: 'star',
      description: 'Extra text',
    })
    expect(en2.features).toHaveLength(4)
  })
})

describe('seed upsertApp on a legacy app (labels only, never seeded)', () => {
  const legacyApp: SeedApp = {
    ...app,
    slug: `seed-legacy-${suffix}`,
    name: `Seed Legacy ${suffix}`,
    packageId: `com.kct.seedlegacy${suffix}`,
  }
  let legacyId: number
  let legacyCategoryId: number

  beforeAll(async () => {
    // The first describe has already removed its own category by now.
    legacyCategoryId = (
      await payload.create({
        collection: 'app-categories',
        data: { title: `Seed Legacy Category ${suffix}`, slug: `seed-legacy-category-${suffix}` },
        context: noRevalidate,
      })
    ).id
    seedAppAccents[legacyApp.slug] = 'teal'
    seedFeatureIcons[legacyApp.slug] = ['banknote', 'wallet', 'pie-chart']
  })

  afterAll(async () => {
    delete seedAppAccents[legacyApp.slug]
    delete seedFeatureIcons[legacyApp.slug]
    if (legacyId) await payload.delete({ collection: 'apps', id: legacyId, context: noRevalidate })
    await payload.delete({
      collection: 'app-categories',
      id: legacyCategoryId,
      context: noRevalidate,
    })
  })

  it('fills the icons, highlights and accent of an app that only has feature labels', async () => {
    const created = await payload.create({
      collection: 'apps',
      data: {
        name: legacyApp.name,
        slug: legacyApp.slug,
        generateSlug: false,
        tagline: 'Tagline',
        shortDescription: 'Short',
        icon: mediaId,
        category: legacyCategoryId,
        status: 'live',
        platforms: ['android'],
        features: legacyApp.features.id.map((label) => ({ label })),
        _status: 'published',
      },
      context: noRevalidate,
    })
    legacyId = created.id

    await upsertApp(payload, legacyApp, {
      icon: mediaId,
      screenshots: [],
      categoryId: legacyCategoryId,
    })

    const doc = await payload.findByID({
      collection: 'apps',
      id: legacyId,
      locale: 'en',
      fallbackLocale: false,
      depth: 0,
    })
    expect(doc.accentColor).toBe('teal')
    expect(doc.features?.map((f) => f.icon)).toEqual(['banknote', 'wallet', 'pie-chart'])
    expect(doc.highlights).toHaveLength(3)
  })
})
