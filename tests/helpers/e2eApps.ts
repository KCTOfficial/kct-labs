import { expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test'

import { CLEANUP_TIMEOUT, cleanupLegalDataRest } from './restCleanup'
import { seedTestUser, testUser } from './seedUser'

export const BASE = 'http://localhost:3000'

type Playwright = PlaywrightWorkerArgs['playwright']

export type E2eContext = {
  request: APIRequestContext
  token: string
  suffix: string
  mediaId: number
  categoryId: number
  seededUserId: number | null
  created: Array<{ collection: string; id: number }>
}

const restLogin = async (request: APIRequestContext) => {
  const res = await request.post(`${BASE}/api/users/login`, { data: testUser })
  if (!res.ok()) return null
  return (await res.json()) as { token: string; user: { id: number } }
}

const post = async (
  ctx: Pick<E2eContext, 'request' | 'token' | 'created'>,
  collection: string,
  data: Record<string, unknown>,
  locale: 'en' | 'id',
) => {
  const res = await ctx.request.post(`${BASE}/api/${collection}?locale=${locale}`, {
    data,
    headers: { Authorization: `JWT ${ctx.token}` },
  })
  expect(res.ok(), `${collection}: ${await res.text()}`).toBe(true)
  const { doc } = (await res.json()) as { doc: { id: number; slug?: string } }
  ctx.created.unshift({ collection, id: doc.id })
  return doc
}

/**
 * Logs in over REST (seeding the test user in-process once the dev server answers), finds one media
 * file and creates a category. Everything created here carries `suffix` and is removed by `teardown`.
 */
export const setupE2e = async (playwright: Playwright, suffix: string): Promise<E2eContext> => {
  const request = await playwright.request.newContext()
  let login = await restLogin(request)
  let seededUserId: number | null = null
  if (!login) {
    // Only seed after the dev server answered (its schema push is done), to avoid concurrent pushes.
    expect((await request.get(`${BASE}/api/apps?limit=1`)).ok()).toBe(true)
    await seedTestUser()
    login = await restLogin(request)
    if (!login) throw new Error('Test user login failed')
    seededUserId = login.user.id
  }
  const token = login.token

  const media = await request.get(`${BASE}/api/media?limit=1&depth=0`, {
    headers: { Authorization: `JWT ${token}` },
  })
  const mediaId = ((await media.json()) as { docs: Array<{ id: number }> }).docs[0]?.id
  if (!mediaId) throw new Error('Seed media first (pnpm seed:kct)')

  const created: E2eContext['created'] = []
  const category = await post(
    { request, token, created },
    'app-categories',
    { title: `E2E Category ${suffix}`, slug: `e2e-category-${suffix}` },
    'id',
  )
  return { request, token, suffix, mediaId, categoryId: category.id, seededUserId, created }
}

/** Creates a published app (slug carries the suffix). Defaults to the default locale (Indonesian). */
export const createApp = async (
  ctx: E2eContext,
  name: string,
  overrides: Record<string, unknown> = {},
  locale: 'en' | 'id' = 'id',
) => {
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ctx.suffix}`
  const doc = await post(
    ctx,
    'apps',
    {
      name: `${name} ${ctx.suffix}`,
      slug,
      tagline: `Tagline ${name}`,
      shortDescription: `Short description of ${name}`,
      icon: ctx.mediaId,
      category: ctx.categoryId,
      platforms: ['android'],
      status: 'live',
      _status: 'published',
      ...overrides,
    },
    locale,
  )
  return { id: doc.id, slug: doc.slug ?? slug }
}

export const teardownE2e = async (playwright: Playwright, ctx: E2eContext) => {
  const request = await playwright.request.newContext()
  await cleanupLegalDataRest(request, BASE, ctx.token, ctx.created, ctx.suffix)
  if (ctx.seededUserId !== null) {
    await request.delete(`${BASE}/api/users/${ctx.seededUserId}`, {
      headers: { Authorization: `JWT ${ctx.token}` },
    })
  }
  await request.dispose()
  await ctx.request.dispose()
}

export { CLEANUP_TIMEOUT }
