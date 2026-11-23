import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { seedTestUser, testUser } from '../helpers/seedUser'

/** Creates its own uniquely-named app/doc data through the admin REST API and removes it after. */
const BASE = 'http://localhost:3000'
const suffix = Date.now().toString(36)
const APP_NAME = `Legal App ${suffix}`
const APP_SLUG = `legal-app-${suffix}`
const ARCHIVED_SLUG = `legal-archived-${suffix}`
const EMPTY_SLUG = `legal-empty-${suffix}`
const INDEX_PATH = `/apps/${APP_SLUG}/legal`
const DOC_SLUG = 'privacy-policy'
const DOC_PATH = `/apps/${APP_SLUG}/legal/${DOC_SLUG}`

const INTRO =
  'This privacy policy explains which information the app collects, how that information is used, ' +
  'and the choices you have about it. Please read it carefully before using the app every day.'

const MARKDOWN = [
  '# Privacy Policy',
  '',
  INTRO,
  '',
  '## Data we collect',
  '',
  'We collect nothing. See [Google](https://www.google.com).',
  '',
  '<script>window.__pwned = true</script>',
  '',
  '| Column A | Column B |',
  '| --- | --- |',
  '| one | two |',
  '',
  '## Contact',
  '',
  'Write to us.',
  '',
].join('\n')

let token = ''
let seededUserId: number | null = null

const restLogin = async (request: APIRequestContext) => {
  const res = await request.post(`${BASE}/api/users/login`, { data: testUser })
  if (!res.ok()) return null
  return (await res.json()) as { token: string; user: { id: number } }
}
const created: Array<{ collection: string; id: number }> = []

const api = async (
  request: APIRequestContext,
  collection: string,
  data: Record<string, unknown>,
) => {
  const res = await request.post(`${BASE}/api/${collection}?locale=en`, {
    data,
    headers: { Authorization: `JWT ${token}` },
  })
  expect(res.ok(), `${collection}: ${await res.text()}`).toBe(true)
  const { doc } = (await res.json()) as { doc: { id: number } }
  created.unshift({ collection, id: doc.id })
  return doc
}

const headTags = async (page: Page) =>
  page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    robots: [...document.querySelectorAll('meta[name="robots"]')]
      .map((m) => m.getAttribute('content'))
      .join(' '),
    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) =>
      l.getAttribute('hreflang'),
    ),
    h1: document.querySelectorAll('h1').length,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) =>
      ([] as Array<{ '@type': string }>)
        .concat(JSON.parse(s.textContent || '[]'))
        .map((o) => o['@type']),
    ),
  }))

test.describe('Legal document page', () => {
  // Shared fixture data → one worker; the first Payload init (schema pull) can be slow.
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ playwright }) => {
    test.setTimeout(180_000)
    const request = await playwright.request.newContext()
    let login = await restLogin(request)
    if (!login) {
      // No REST route can create the first test user, so seed it in-process — only once the
      // dev server has answered (its schema push is done), to avoid concurrent pushes.
      expect((await request.get(`${BASE}/api/apps?limit=1`)).ok()).toBe(true)
      await seedTestUser()
      login = await restLogin(request)
      if (!login) throw new Error('Test user login failed')
      seededUserId = login.user.id
    }
    token = login.token

    const media = await request.get(`${BASE}/api/media?limit=1&depth=0`, {
      headers: { Authorization: `JWT ${token}` },
    })
    const mediaId = ((await media.json()) as { docs: Array<{ id: number }> }).docs[0]?.id
    if (!mediaId) throw new Error('Seed media first (pnpm seed:kct)')

    const category = await api(request, 'app-categories', {
      title: `Legal Category ${suffix}`,
      slug: `legal-category-${suffix}`,
    })
    const type = await api(request, 'document-types', {
      title: `Legal Type ${suffix}`,
      slug: `legal-type-${suffix}`,
    })
    const termsType = await api(request, 'document-types', {
      title: `Legal Terms Type ${suffix}`,
      slug: `legal-terms-type-${suffix}`,
      sortOrder: 10,
    })
    const appData = {
      tagline: 'A tagline long enough to top up the generated description of the legal index page.',
      shortDescription: 'Short description',
      icon: mediaId,
      category: category.id,
      platforms: ['android'],
      _status: 'published',
    }
    const app = await api(request, 'apps', {
      ...appData,
      name: APP_NAME,
      slug: APP_SLUG,
      status: 'live',
    })
    const archived = await api(request, 'apps', {
      ...appData,
      name: `Legal Archived ${suffix}`,
      slug: ARCHIVED_SLUG,
      status: 'archived',
    })
    await api(request, 'apps', {
      ...appData,
      name: `Legal Empty ${suffix}`,
      slug: EMPTY_SLUG,
      status: 'live',
    })
    await api(request, 'app-documents', {
      app: app.id,
      documentType: termsType.id,
      slug: 'terms-of-service',
      title: 'Terms of Service',
      markdown: '# Terms\n\nUse the app fairly.\n',
      _status: 'published',
    })
    for (const appId of [app.id, archived.id]) {
      await api(request, 'app-documents', {
        app: appId,
        documentType: type.id,
        slug: DOC_SLUG,
        title: 'Privacy Policy',
        markdown: MARKDOWN,
        _status: 'published',
      })
    }
    await request.dispose()
  })

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    for (const { collection, id } of created) {
      await request.delete(`${BASE}/api/${collection}/${id}`, {
        headers: { Authorization: `JWT ${token}` },
      })
    }
    if (seededUserId !== null) {
      await request.delete(`${BASE}/api/users/${seededUserId}`, {
        headers: { Authorization: `JWT ${token}` },
      })
    }
    await request.dispose()
  })

  test('EN page has complete SEO metadata, one h1 and a TOC of h2s', async ({ page }) => {
    const res = await page.goto(`${BASE}${DOC_PATH}`)
    expect(res?.status()).toBe(200)
    const title = await page.title()
    expect(title).toBe(`Privacy Policy – ${APP_NAME} | KCT Hub`)
    expect(title.length).toBeLessThanOrEqual(60)
    const tags = await headTags(page)
    expect(tags.description.length).toBeGreaterThanOrEqual(120)
    expect(tags.description.length).toBeLessThanOrEqual(160)
    expect(tags.canonical).toMatch(new RegExp(`^https?://[^/]+${DOC_PATH}$`))
    expect(tags.robots).not.toContain('noindex')
    // No Indonesian content → no hreflang alternates for this document.
    expect(tags.hreflang).not.toContain('id')
    expect(tags.h1).toBe(1)
    expect(tags.jsonLd).toEqual(expect.arrayContaining(['BreadcrumbList', 'WebPage']))

    const toc = page.locator('nav[data-legal-toc] a')
    await expect(toc).toHaveText(['Data we collect', 'Contact'])
    expect(await toc.first().getAttribute('href')).toBe('#data-we-collect')
    await expect(page.locator('article h2#data-we-collect')).toHaveCount(1)
    await expect(page.locator('article .overflow-x-auto table')).toHaveCount(1)
    const external = page.locator('article a[href="https://www.google.com"]')
    await expect(external).toHaveAttribute('target', '_blank')
    await expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('markdown <script> never becomes a script element', async ({ page }) => {
    await page.goto(`${BASE}${DOC_PATH}`)
    await expect(page.locator('article script')).toHaveCount(0)
    expect(await page.evaluate(() => (window as { __pwned?: boolean }).__pwned)).toBeUndefined()
  })

  test('/id without Indonesian content shows the fallback banner and EN canonical', async ({
    page,
  }) => {
    const res = await page.goto(`${BASE}/id${DOC_PATH}`)
    expect(res?.status()).toBe(200)
    await expect(page.locator('[data-legal-fallback]')).toBeVisible()
    await expect(page.locator('article[lang="en"]')).toHaveCount(1)
    const tags = await headTags(page)
    expect(tags.canonical).toMatch(new RegExp(`^https?://[^/]+${DOC_PATH}$`))
    expect(tags.hreflang).not.toContain('id')
  })

  test('unknown document returns 404', async ({ page }) => {
    const res = await page.goto(`${BASE}/apps/${APP_SLUG}/legal/does-not-exist`)
    expect(res?.status()).toBe(404)
  })

  test('archived app keeps the page reachable but noindex', async ({ page }) => {
    const res = await page.goto(`${BASE}/apps/${ARCHIVED_SLUG}/legal/${DOC_SLUG}`)
    expect(res?.status()).toBe(200)
    expect((await headTags(page)).robots).toContain('noindex')
  })

  test('index lists published documents in order, linking to each', async ({ page }) => {
    const res = await page.goto(`${BASE}${INDEX_PATH}`)
    expect(res?.status()).toBe(200)
    const items = page.locator('main ul[data-legal-index] a')
    await expect(items).toHaveCount(2)
    await expect(items.nth(0)).toContainText('Privacy Policy')
    await expect(items.nth(1)).toContainText('Terms of Service')
    expect(await items.nth(0).getAttribute('href')).toBe(`${INDEX_PATH}/${DOC_SLUG}`)
    expect(await items.nth(1).getAttribute('href')).toBe(`${INDEX_PATH}/terms-of-service`)

    const title = await page.title()
    expect(title.length).toBeLessThanOrEqual(60)
    const tags = await headTags(page)
    expect(tags.h1).toBe(1)
    expect(tags.jsonLd).toEqual(expect.arrayContaining(['BreadcrumbList', 'ItemList']))
    expect(tags.canonical).toMatch(new RegExp(`^https?://[^/]+${INDEX_PATH}$`))
    // No Indonesian content on any document → no hreflang alternates, as on the doc page.
    expect(tags.hreflang).not.toContain('id')
    expect(title).toBe(`Legal documents – ${APP_NAME} | KCT Hub`)
    expect(tags.description.length).toBeGreaterThanOrEqual(120)
    expect(tags.description.length).toBeLessThanOrEqual(160)
    expect(tags.robots).not.toContain('noindex')
  })

  test('/id index links to prefixed document paths', async ({ page }) => {
    const res = await page.goto(`${BASE}/id${INDEX_PATH}`)
    expect(res?.status()).toBe(200)
    expect(await page.locator('main ul[data-legal-index] a').first().getAttribute('href')).toBe(
      `/id${INDEX_PATH}/${DOC_SLUG}`,
    )
    const tags = await headTags(page)
    expect(tags.description.length).toBeGreaterThanOrEqual(120)
    expect(tags.description.length).toBeLessThanOrEqual(160)
    expect(await page.title()).toMatch(/ \| KCT Hub$/)
    // No Indonesian content → single EN canonical, as on the doc page.
    expect(tags.canonical).toMatch(new RegExp(`^https?://[^/]+${INDEX_PATH}$`))
  })

  test('app without documents returns 404', async ({ page }) => {
    const res = await page.goto(`${BASE}/apps/${EMPTY_SLUG}/legal`)
    expect(res?.status()).toBe(404)
  })

  test('unknown app index returns 404', async ({ page }) => {
    const res = await page.goto(`${BASE}/apps/no-such-app-${suffix}/legal`)
    expect(res?.status()).toBe(404)
  })

  test('archived app index is reachable but noindex', async ({ page }) => {
    const res = await page.goto(`${BASE}/apps/${ARCHIVED_SLUG}/legal`)
    expect(res?.status()).toBe(200)
    expect((await headTags(page)).robots).toContain('noindex')
  })
})
