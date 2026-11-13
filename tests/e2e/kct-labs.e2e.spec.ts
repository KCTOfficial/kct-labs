import { expect, test, type Page } from '@playwright/test'

/** Requires seeded content: `pnpm seed:kct`. */
const BASE = 'http://localhost:3000'

const headTags = async (page: Page) =>
  page.evaluate(() => ({
    lang: document.documentElement.lang,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) =>
      m.getAttribute('content'),
    ),
    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) =>
      l.getAttribute('hreflang'),
    ),
    ogLocale: document.querySelector('meta[property="og:locale"]')?.getAttribute('content'),
    h1: document.querySelectorAll('h1').length,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) =>
      ([] as Array<{ '@type': string }>)
        .concat(JSON.parse(s.textContent || '[]'))
        .map((o) => o['@type']),
    ),
    imagesWithoutAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt'))
      .length,
  }))

test.describe('KCT Labs — routing & i18n', () => {
  test('English is served without a prefix and /en redirects to it', async ({ page }) => {
    const res = await page.goto(`${BASE}/en/apps`)
    expect(res?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe('/apps')
  })

  test('language switch keeps the current page and query', async ({ page }) => {
    await page.goto(`${BASE}/apps?category=finance`)
    await page.locator('header nav[aria-label="Change language"] a[hreflang="id"]').first().click()
    await expect(page).toHaveURL(/\/id\/apps\?category=finance$/)
    await expect(page.locator('h1')).toContainText('Semua Aplikasi')
  })

  test('unknown app slug returns a real 404', async ({ page }) => {
    const res = await page.goto(`${BASE}/apps/this-app-does-not-exist`)
    expect(res?.status()).toBe(404)
  })
})

test.describe('KCT Labs — SEO', () => {
  for (const [path, locale, schema] of [
    ['/', 'en', 'Organization'],
    ['/id', 'id', 'WebSite'],
    ['/apps', 'en', 'ItemList'],
    ['/apps/al-quran-imam', 'en', 'MobileApplication'],
    ['/id/apps/al-quran-imam', 'id', 'BreadcrumbList'],
  ] as const) {
    test(`${path} has complete, indexable metadata`, async ({ page }) => {
      const res = await page.goto(`${BASE}${path}`)
      expect(res?.status()).toBe(200)
      const tags = await headTags(page)
      expect(tags.lang).toBe(locale)
      expect(tags.canonical).toBeTruthy()
      expect(tags.description.length).toBeGreaterThan(50)
      expect(tags.description.length).toBeLessThanOrEqual(160)
      expect(tags.robots.join(' ')).not.toContain('noindex')
      expect(tags.hreflang).toEqual(expect.arrayContaining(['en', 'id', 'x-default']))
      expect(tags.ogLocale).toBe(locale === 'id' ? 'id_ID' : 'en_US')
      expect(tags.h1).toBe(1)
      expect(tags.jsonLd).toContain(schema)
      expect(tags.imagesWithoutAlt).toBe(0)
    })
  }

  test('search results are noindex', async ({ page }) => {
    await page.goto(`${BASE}/apps?q=quran`)
    expect((await headTags(page)).robots.join(' ')).toContain('noindex')
  })

  test('apps sitemap lists both locales with hreflang', async ({ request }) => {
    const res = await request.get(`${BASE}/apps-sitemap.xml`)
    expect(res.status()).toBe(200)
    const xml = await res.text()
    expect(xml).toContain('/apps/al-quran-imam</loc>')
    expect(xml).toContain('/id/apps/al-quran-imam</loc>')
    expect(xml).toContain('hreflang="x-default"')
  })
})

test.describe('KCT Labs — listing behaviour', () => {
  test('category filter narrows results and empty search shows the empty state', async ({
    page,
  }) => {
    await page.goto(`${BASE}/apps?category=finance`)
    await expect(page.locator('main article')).toHaveCount(1)
    await page.goto(`${BASE}/apps?q=zzzz-no-match`)
    await expect(page.getByRole('heading', { name: 'No apps found' })).toBeVisible()
  })

  test('mobile menu opens, traps scroll and closes with Escape', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const page = await context.newPage()
    await page.goto(BASE)
    const toggle = page.getByRole('button', { name: 'Open menu' })
    await toggle.click()
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    await context.close()
  })
})
