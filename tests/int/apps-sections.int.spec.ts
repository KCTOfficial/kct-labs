import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { Apps } from '@/collections/Apps'
import config from '@/payload.config'

/**
 * App page sections (accent colour, highlights, How it works, feature icons, data banner).
 * Runs against the configured DATABASE_URL; creates uniquely-named documents and deletes them.
 */
let payload: Payload
const suffix = `sections-${Date.now()}`
const created: { apps: number[]; categories: number[]; media: number[] } = {
  apps: [],
  categories: [],
  media: [],
}
let iconId: number

const noRevalidate = { disableRevalidate: true }

const baseApp = (overrides: Record<string, unknown> = {}) => ({
  name: `Sections App ${suffix}`,
  slug: `sections-app-${suffix}-${created.apps.length}`,
  tagline: 'Tagline',
  shortDescription: 'Short',
  icon: iconId,
  category: created.categories[0],
  status: 'live' as const,
  platforms: ['android' as const],
  ...overrides,
})

const create = async (overrides: Record<string, unknown> = {}, locale?: 'en' | 'id') => {
  const app = await payload.create({
    collection: 'apps',
    data: baseApp({ _status: 'published', ...overrides }),
    ...(locale ? { locale } : {}),
    context: noRevalidate,
  })
  created.apps.push(app.id)
  return app
}

// 1×1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('Apps page sections', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const category = await payload.create({
      collection: 'app-categories',
      data: { title: `Sections Category ${suffix}`, slug: `sections-category-${suffix}` },
      context: noRevalidate,
    })
    created.categories.push(category.id)
    const media = await payload.find({ collection: 'media', limit: 1, depth: 0 })
    if (!media.docs[0]) throw new Error('Seed media first (pnpm seed:kct)')
    iconId = media.docs[0].id
  })

  afterAll(async () => {
    for (const id of created.apps) {
      await payload.delete({ collection: 'apps', id, context: noRevalidate })
    }
    for (const id of created.categories) {
      await payload.delete({ collection: 'app-categories', id, context: noRevalidate })
    }
    for (const id of created.media) {
      await payload.delete({ collection: 'media', id }).catch(() => undefined)
    }
  })

  it('an app without any new field stays valid and reads back empty', async () => {
    const app = await create()
    const doc = await payload.findByID({ collection: 'apps', id: app.id, depth: 0 })
    expect(doc.accentColor ?? null).toBeNull()
    expect(doc.highlights ?? []).toEqual([])
    expect(doc.howItWorks?.steps ?? []).toEqual([])
    expect(doc.howItWorks?.title ?? null).toBeNull()
    expect(doc.featuresIntro?.title ?? null).toBeNull()
    expect(doc.dataControl?.title ?? null).toBeNull()
  })

  it('stores a full set of sections and reads it back', async () => {
    const app = await create({
      accentColor: 'green',
      highlights: [
        { icon: 'zap', title: 'Offline ready', description: 'No internet needed' },
        { icon: 'camera', title: 'Receipt scan' },
      ],
      howItWorks: {
        title: 'Simple steps',
        description: 'Start in a few taps.',
        steps: [
          { title: 'Record', description: 'Add a transaction.', image: iconId },
          { title: 'Track' },
        ],
      },
      featuresIntro: { title: 'Everything you need', description: 'From recording to reports.' },
      features: [{ label: 'Budget', icon: 'wallet', description: 'Set monthly budgets' }],
      dataControl: { title: 'Your data, your control', description: 'Stored on your device.' },
    })
    const doc = await payload.findByID({ collection: 'apps', id: app.id, depth: 0 })
    expect(doc.accentColor).toBe('green')
    expect(doc.highlights?.map((h) => [h.icon, h.title, h.description ?? null])).toEqual([
      ['zap', 'Offline ready', 'No internet needed'],
      ['camera', 'Receipt scan', null],
    ])
    expect(doc.howItWorks?.steps?.map((s) => s.title)).toEqual(['Record', 'Track'])
    expect(doc.howItWorks?.steps?.[0]?.image).toBe(iconId)
    expect(doc.features?.[0]).toMatchObject({ label: 'Budget', icon: 'wallet' })
    expect(doc.dataControl?.title).toBe('Your data, your control')
  })

  it('texts are per locale and an empty Indonesian field falls back to English', async () => {
    const app = await create(
      { highlights: [{ icon: 'zap', title: 'Offline ready', description: 'No internet needed' }] },
      'en',
    )
    const [enDoc, idDoc] = await Promise.all([
      payload.findByID({ collection: 'apps', id: app.id, locale: 'en', depth: 0 }),
      payload.findByID({ collection: 'apps', id: app.id, locale: 'id', depth: 0 }),
    ])
    expect(enDoc.highlights?.[0]?.title).toBe('Offline ready')
    expect(idDoc.highlights?.[0]?.title).toBe('Offline ready') // empty in ID → EN
    expect(idDoc.highlights?.[0]?.icon).toBe('zap') // icon is not localized
  })

  it('rejects icons outside the registry and accent colours outside the presets', async () => {
    await expect(
      create({ highlights: [{ icon: 'not-an-icon', title: 'Bad icon' }] }),
    ).rejects.toThrow()
    await expect(create({ features: [{ label: 'Bad', icon: '<img src=x>' }] })).rejects.toThrow()
    await expect(create({ howItWorks: { steps: [] }, accentColor: '#ff0000' })).rejects.toThrow()
  })

  it('enforces the row limits (3 highlights, 4 steps)', async () => {
    const row = (n: number) => ({ icon: 'zap', title: `Highlight ${n}` })
    await expect(create({ highlights: [1, 2, 3, 4].map(row) })).rejects.toThrow()
    await expect(
      create({
        howItWorks: { steps: [1, 2, 3, 4, 5].map((n) => ({ title: `Step ${n}` })) },
      }),
    ).rejects.toThrow()
    await create({ highlights: [1, 2, 3].map(row) }) // the limit itself is fine
  })

  it('a highlight row needs a title in the default locale; the description is optional', async () => {
    await expect(create({ highlights: [{ icon: 'zap' }] })).rejects.toThrow()
    await create({ highlights: [{ title: 'No icon, no description' }] })
  })

  it('legacy features with only a label stay valid', async () => {
    const app = await create({ features: [{ label: 'Plain feature' }] })
    const doc = await payload.findByID({ collection: 'apps', id: app.id, depth: 0 })
    expect(doc.features?.[0]?.label).toBe('Plain feature')
    expect(doc.features?.[0]?.icon ?? null).toBeNull()
  })

  it('deleting a step image does not break reading the app', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: `step ${suffix}` },
      file: { data: PNG, mimetype: 'image/png', name: `step-${suffix}.png`, size: PNG.length },
    })
    created.media.push(media.id)
    const app = await create({
      howItWorks: { steps: [{ title: 'With image', image: media.id }] },
    })
    await payload.delete({ collection: 'media', id: media.id })
    const doc = await payload.findByID({ collection: 'apps', id: app.id, depth: 1 })
    expect(doc.howItWorks?.steps?.[0]?.title).toBe('With image')
    expect(doc.howItWorks?.steps?.[0]?.image ?? null).toBeNull()
  })

  it('card/listing populate does not load the new fields', () => {
    const populated = Object.keys(Apps.defaultPopulate ?? {})
    for (const key of ['accentColor', 'highlights', 'howItWorks', 'featuresIntro', 'dataControl']) {
      expect(populated).not.toContain(key)
    }
  })
})

describe('Apps admin form: key features', () => {
  type AnyField = {
    name?: string
    type?: string
    label?: string
    fields?: AnyField[]
    tabs?: AnyField[]
    admin?: { components?: unknown }
  }
  const flatten = (fields: AnyField[]): AnyField[] =>
    fields.flatMap((f) => (f.type === 'row' ? flatten(f.fields ?? []) : [f]))
  const tabs = (Apps.fields as AnyField[]).find((f) => f.type === 'tabs')!.tabs as AnyField[]
  const tab = (label: string) => flatten(tabs.find((t) => t.label === label)!.fields ?? [])

  it('are edited in the Page sections tab, next to the other detail page content', () => {
    expect(tab('Page sections').map((f) => f.name)).toContain('features')
    expect(tab('Details').map((f) => f.name)).not.toContain('features')
  })

  it('offer icon, label and description in each row', () => {
    const features = tab('Page sections').find((f) => f.name === 'features')!
    // Payload adds its own `id` field to every array row when the config is sanitized.
    expect(
      flatten(features.fields ?? [])
        .map((f) => f.name)
        .filter((name) => name !== 'id'),
    ).toEqual(['icon', 'label', 'description'])
  })

  it('every repeating section gets the same readable row title (label, not "Feature 01")', () => {
    for (const name of ['highlights', 'features']) {
      const field = tab('Page sections').find((f) => f.name === name)!
      expect(JSON.stringify(field.admin?.components), name).toContain('SectionRowLabel')
    }
  })
})
