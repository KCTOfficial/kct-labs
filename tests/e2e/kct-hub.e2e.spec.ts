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
    alternates: Object.fromEntries(
      [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
        l.getAttribute('hreflang'),
        l.getAttribute('href'),
      ]),
    ) as Record<string, string | null>,
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

test.describe('KCT Hub — routing & i18n', () => {
  test('Indonesian is served without a prefix and /id redirects (308) to it', async ({
    page,
    request,
  }) => {
    const redirect = await request.get(`${BASE}/id/apps?sort=name`, { maxRedirects: 0 })
    expect(redirect.status()).toBe(308)
    expect(new URL(redirect.headers().location, BASE).pathname).toBe('/apps')
    expect(new URL(redirect.headers().location, BASE).search).toBe('?sort=name')
    const res = await page.goto(`${BASE}/id/apps`)
    expect(res?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe('/apps')
    await expect(page.locator('h1')).toContainText('Semua Aplikasi')
  })

  test('/en is served as English (no redirect); look-alike paths are not locales', async ({
    page,
    request,
  }) => {
    const res = await page.goto(`${BASE}/en/apps`)
    expect(res?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe('/en/apps')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('h1')).toContainText('All Apps')
    for (const path of ['/identity', '/enter']) {
      expect((await request.get(`${BASE}${path}`, { maxRedirects: 0 })).status()).toBe(404)
    }
  })

  test('language switch keeps the current page and query', async ({ page }) => {
    await page.goto(`${BASE}/apps?category=finance`)
    await page.locator('header nav[aria-label="Ganti bahasa"] a[hreflang="en"]').first().click()
    await expect(page).toHaveURL(/\/en\/apps\?category=finance$/)
    await expect(page.locator('h1')).toContainText('All Apps')
  })

  test('unknown app slug returns a real 404', async ({ page }) => {
    const res = await page.goto(`${BASE}/apps/this-app-does-not-exist`)
    expect(res?.status()).toBe(404)
  })
})

test.describe('KCT Hub — SEO', () => {
  for (const [path, locale, schema] of [
    ['/', 'id', 'Organization'],
    ['/en', 'en', 'WebSite'],
    ['/apps', 'id', 'ItemList'],
    ['/en/apps', 'en', 'ItemList'],
    ['/en/apps/al-quran-imam', 'en', 'MobileApplication'],
    ['/apps/al-quran-imam', 'id', 'BreadcrumbList'],
  ] as const) {
    test(`${path} has complete, indexable metadata`, async ({ page }) => {
      const res = await page.goto(`${BASE}${path}`)
      expect(res?.status()).toBe(200)
      const tags = await headTags(page)
      expect(tags.lang).toBe(locale)
      expect(tags.canonical).toBeTruthy()
      // Canonical is absolute and points at this very URL; x-default is the unprefixed (ID) one.
      expect(new URL(tags.canonical!).pathname).toBe(path)
      const unprefixed = path.replace(/^\/en(?=\/|$)/, '') || '/'
      expect(new URL(tags.alternates['x-default']!).pathname).toBe(unprefixed)
      expect(new URL(tags.alternates.id!).pathname).toBe(unprefixed)
      expect(new URL(tags.alternates.en!).pathname).toBe(
        unprefixed === '/' ? '/en' : `/en${unprefixed}`,
      )
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

  test('brand: KCT Hub title, default OG image, favicons and Organization logo', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`)
    await expect(page).toHaveTitle(/KCT Hub/)
    const head = await page.evaluate(() => ({
      title: document.title,
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
      ogSiteName: document.querySelector('meta[property="og:site_name"]')?.getAttribute('content'),
      icons: [...document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].map(
        (l) => l.getAttribute('href'),
      ),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) =>
        ([] as Array<Record<string, unknown>>).concat(JSON.parse(s.textContent || '[]')),
      ),
    }))
    expect(head.title).not.toContain('KCT Labs')
    expect(head.ogSiteName).toBe('KCT Hub')
    expect(head.ogImage).toMatch(/\/og-kct-hub\.png$/)
    expect(head.icons.some((href) => href?.startsWith('/favicon.ico'))).toBe(true)
    expect(head.icons.some((href) => href?.startsWith('/apple-touch-icon.png'))).toBe(true)
    const website = head.jsonLd.find((o) => o['@type'] === 'WebSite')
    const organization = head.jsonLd.find((o) => o['@type'] === 'Organization')
    expect(website?.name).toBe('KCT Hub')
    // The Organization is the company (PT KCT), so it keeps the company logo.
    expect(organization?.name).toBe('PT Kreasindo Cipta Teknologi')
    expect(String(organization?.logo)).toMatch(/\/kct-logo\.png$/)
    for (const asset of ['/og-kct-hub.png', '/favicon.ico', '/apple-touch-icon.png']) {
      expect((await page.request.get(`${BASE}${asset}`)).status()).toBe(200)
    }
  })

  test('brand: header/footer show the theme-matching KCT Hub logo', async ({ page }) => {
    await page.goto(`${BASE}/`)
    const home = page.locator('header').getByRole('link', { name: 'KCT Hub', exact: true }).first()
    await expect(home).toBeVisible()
    const visibleLogos = async () =>
      page.evaluate(() =>
        [...document.querySelectorAll('header img[alt="KCT Hub"]')]
          .filter((img) => (img as HTMLElement).offsetParent !== null)
          .map((img) => (img.classList.contains('brand-logo-dark') ? 'dark' : 'light')),
      )
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    expect(new Set(await visibleLogos())).toEqual(new Set(['light']))
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    expect(new Set(await visibleLogos())).toEqual(new Set(['dark']))
    await expect(page.locator('footer img[alt="KCT Hub"]').first()).toBeAttached()
  })

  test('search results are noindex', async ({ page }) => {
    await page.goto(`${BASE}/apps?q=quran`)
    expect((await headTags(page)).robots.join(' ')).toContain('noindex')
  })

  test('apps sitemap lists both locales with hreflang', async ({ request }) => {
    const res = await request.get(`${BASE}/apps-sitemap.xml`)
    expect(res.status()).toBe(200)
    const xml = await res.text()
    expect(xml).toContain('/apps/al-quran-imam</loc>')
    expect(xml).toContain('/en/apps/al-quran-imam</loc>')
    expect(xml).not.toContain('/id/apps/al-quran-imam</loc>')
    expect(xml).toContain('hreflang="x-default"')
  })
})

test.describe('KCT Hub — listing behaviour', () => {
  test('category filter narrows results and empty search shows the empty state', async ({
    page,
  }) => {
    await page.goto(`${BASE}/apps?category=finance`)
    await expect(page.locator('main article')).toHaveCount(1)
    await page.goto(`${BASE}/apps?q=zzzz-no-match`)
    await expect(page.getByRole('heading', { name: 'Aplikasi tidak ditemukan' })).toBeVisible()
    await page.goto(`${BASE}/en/apps?q=zzzz-no-match`)
    await expect(page.getByRole('heading', { name: 'No apps found' })).toBeVisible()
  })

  test('mobile menu opens, traps scroll and closes with Escape', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
    const page = await context.newPage()
    await page.goto(`${BASE}/en`)
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
