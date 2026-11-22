import { expect, test, type Browser, type Page } from '@playwright/test'

/** Requires seeded content (`pnpm seed:kct`) and a running server on :3000 (dev or production). */
const BASE = 'http://localhost:3000'
const SLUG = 'al-quran-imam'
const NAME = 'Al Quran Imam'

const dialog = (page: Page) => page.locator('dialog.qv-dialog')
const card = (page: Page, slug = SLUG) =>
  page.locator(`article a[data-quick-view][href$="/apps/${slug}"]`)

/** The provider flags readiness once its listeners are attached (avoids clicking before hydration). */
const gotoReady = async (page: Page, path: string) => {
  await page.goto(`${BASE}${path}`)
  await page.locator('html[data-qv-ready="true"]').waitFor({ state: 'attached' })
}

const open = async (page: Page, slug = SLUG) => {
  await card(page, slug).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).locator('h2')).toBeVisible()
}

const withPage = async (
  browser: Browser,
  options: Parameters<Browser['newContext']>[0],
  run: (page: Page) => Promise<void>,
) => {
  const context = await browser.newContext(options)
  try {
    await run(await context.newPage())
  } finally {
    await context.close()
  }
}

test.describe('Quick view — open & close', () => {
  test('click opens the popup, pushes the shareable URL and keeps the page intact', async ({
    page,
  }) => {
    await gotoReady(page, '/apps')
    const articlesBefore = await page.locator('main article').count()
    await page.evaluate(() => window.scrollTo(0, 200))
    const scrollBefore = await page.evaluate(() => window.scrollY)

    await open(page)

    await expect(page).toHaveURL(`${BASE}/apps/${SLUG}`)
    await expect(page.getByRole('dialog', { name: NAME })).toBeVisible()
    await expect(dialog(page).getByRole('heading', { level: 2, name: NAME })).toBeVisible()
    // SEO/semantics invariants: still the listing underneath, exactly one h1, nothing nested in <main>.
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText('All Apps')
    await expect(page.locator('main article')).toHaveCount(articlesBefore)
    expect(await dialog(page).evaluate((el) => Boolean(el.closest('main')))).toBe(false)
    expect(await dialog(page).locator('article').count()).toBe(0)
    // Scroll position is preserved and the page behind is locked.
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      'hidden',
    )
    // Focus moves into the dialog; actions are real links to the right targets.
    expect(await dialog(page).evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await expect(dialog(page).getByRole('link', { name: 'View full details' })).toHaveAttribute(
      'href',
      `/apps/${SLUG}`,
    )
    const play = dialog(page).getByRole('link', { name: 'Get it on Google Play' })
    await expect(play).toHaveAttribute('href', /^https:\/\/play\.google\.com\//)
    await expect(play).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(play).toHaveAttribute('target', '_blank')
  })

  test('Back closes the popup, Forward reopens it', async ({ page }) => {
    await gotoReady(page, '/apps')
    await open(page)

    await page.goBack()
    await expect(page).toHaveURL(`${BASE}/apps`)
    await expect(dialog(page)).toBeHidden()
    await expect(page.locator('h1')).toHaveText('All Apps')

    await page.goForward()
    await expect(page).toHaveURL(`${BASE}/apps/${SLUG}`)
    await expect(dialog(page).getByRole('heading', { level: 2, name: NAME })).toBeVisible()
  })

  test('Escape closes it, restores the URL and returns focus to the card link', async ({
    page,
  }) => {
    await gotoReady(page, '/apps')
    await open(page)

    await page.keyboard.press('Escape')
    await expect(dialog(page)).toBeHidden()
    await expect(page).toHaveURL(`${BASE}/apps`)
    await expect(card(page)).toBeFocused()
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
      'hidden',
    )
  })

  test('clicking the backdrop closes it; the close button works too', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await gotoReady(page, '/apps')
    await open(page)
    await page.mouse.click(8, 8) // outside the centered dialog = backdrop
    await expect(dialog(page)).toBeHidden()
    await expect(page).toHaveURL(`${BASE}/apps`)

    await open(page)
    await dialog(page).getByRole('button', { name: 'Close' }).click()
    await expect(dialog(page)).toBeHidden()
    await expect(page).toHaveURL(`${BASE}/apps`)
  })

  test('closing and quickly reopening keeps the new popup open (no stale close timer)', async ({
    page,
  }) => {
    await gotoReady(page, '/apps')
    await open(page)
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toBeHidden()
    await open(page, 'koorva-work')
    // Longer than the close-safety timeout: the popup must still be there, on the right URL.
    await page.waitForTimeout(900)
    await expect(dialog(page)).toBeVisible()
    await expect(page).toHaveURL(`${BASE}/apps/koorva-work`)
    await expect(dialog(page).getByRole('heading', { level: 2, name: 'Koorva Work' })).toBeVisible()
  })

  test('double-clicking Close pops history once (never leaves the listing)', async ({ page }) => {
    await gotoReady(page, '/apps')
    await open(page)
    await dialog(page).getByRole('button', { name: 'Close' }).dblclick({ force: true })
    await expect(dialog(page)).toBeHidden()
    await page.waitForTimeout(700)
    await expect(page).toHaveURL(`${BASE}/apps`)
    await expect(page.locator('h1')).toHaveText('All Apps')
  })

  test('works from the home page catalog as well', async ({ page }) => {
    await gotoReady(page, '/')
    await open(page)
    await expect(page).toHaveURL(`${BASE}/apps/${SLUG}`)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(`${BASE}/`)
    await expect(page.locator('h1')).toHaveCount(1)
  })
})

test.describe('Quick view — navigation to the full page', () => {
  test('"View full details" lands on the real detail page and Back returns to the real listing', async ({
    page,
  }) => {
    await gotoReady(page, '/apps')
    const articlesBefore = await page.locator('main article').count()
    await open(page)

    await dialog(page).getByRole('link', { name: 'View full details' }).click()
    await expect(page.locator('h1')).toHaveText(NAME)
    await expect(page).toHaveURL(`${BASE}/apps/${SLUG}`)
    await expect(dialog(page)).toBeHidden()
    await expect(page.locator('h1')).toHaveCount(1)

    await page.goBack()
    await expect(page).toHaveURL(`${BASE}/apps`)
    await expect(page.locator('h1')).toHaveText('All Apps')
    await expect(dialog(page)).toBeHidden()
    await expect(page.locator('main article')).toHaveCount(articlesBefore)
  })

  test('opening the shareable URL directly shows the full page (no popup)', async ({ page }) => {
    await gotoReady(page, `/apps/${SLUG}`)
    await expect(page.locator('h1')).toHaveText(NAME)
    await expect(page.locator('dialog.qv-dialog[open]')).toHaveCount(0)
  })

  test('modifier-click and non-primary clicks are left to the browser (new tab, no popup)', async ({
    page,
    context,
  }) => {
    await gotoReady(page, '/apps')
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      card(page).click({ modifiers: ['Control'] }),
    ])
    await popup.waitForLoadState('domcontentloaded')
    expect(new URL(popup.url()).pathname).toBe(`/apps/${SLUG}`)
    await expect(dialog(page)).toBeHidden()
    await expect(page).toHaveURL(`${BASE}/apps`)
  })

  test('on a detail page, related-app cards navigate normally (no stacked popup)', async ({
    page,
  }) => {
    await gotoReady(page, `/apps/${SLUG}`)
    const related = page.locator('article a[data-quick-view]').first()
    await expect(related).toBeVisible()
    const href = await related.getAttribute('href')
    await related.click()
    await expect(page).toHaveURL(`${BASE}${href}`)
    await expect(page.locator('dialog.qv-dialog[open]')).toHaveCount(0)
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('without JavaScript the card is a plain link', async ({ browser }) => {
    // Home is statically rendered. (/apps streams behind loading.tsx, whose swap script needs JS.)
    await withPage(browser, { javaScriptEnabled: false }, async (page) => {
      await page.goto(`${BASE}/`)
      await card(page).click()
      await expect(page).toHaveURL(`${BASE}/apps/${SLUG}`)
      await expect(page.locator('h1')).toHaveText(NAME)
    })
  })
})

test.describe('Quick view — failures never trap the user', () => {
  test('unknown/archived app (404) falls back to normal navigation', async ({ page }) => {
    await page.route('**/next/quick-view*', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{"error":"not_found"}',
      }),
    )
    await gotoReady(page, '/apps')
    await card(page).click()
    await expect(page).toHaveURL(`${BASE}/apps/${SLUG}`)
    await expect(page.locator('h1')).toHaveText(NAME)
    await expect(page.locator('dialog.qv-dialog[open]')).toHaveCount(0)
  })

  test('server error shows an inline error; Retry recovers', async ({ page }) => {
    let fail = true
    await page.route('**/next/quick-view*', (route) =>
      fail
        ? route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{"error":"unavailable"}',
          })
        : route.continue(),
    )
    await gotoReady(page, '/apps')
    await card(page).click()
    const alert = dialog(page).getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(dialog(page).getByRole('link', { name: 'View full details' })).toBeVisible()

    fail = false
    await dialog(page).getByRole('button', { name: 'Try again' }).click()
    await expect(dialog(page).getByRole('heading', { level: 2, name: NAME })).toBeVisible()
  })

  test('network failure shows the error state and the popup can still be closed', async ({
    page,
  }) => {
    await page.route('**/next/quick-view*', (route) => route.abort('failed'))
    await gotoReady(page, '/apps')
    await card(page).click()
    await expect(dialog(page).getByRole('alert')).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Close' }).click()
    await expect(dialog(page)).toBeHidden()
    await expect(page).toHaveURL(`${BASE}/apps`)
  })

  test('double click opens a single popup and a single history entry', async ({ page }) => {
    await gotoReady(page, '/apps')
    const lengthBefore = await page.evaluate(() => window.history.length)
    await card(page).dblclick()
    await expect(dialog(page)).toBeVisible()
    expect(await page.evaluate(() => window.history.length)).toBe(lengthBefore + 1)
  })
})

test.describe('Quick view — locales, devices, motion', () => {
  test('Indonesian: localized labels and /id URL', async ({ page }) => {
    await gotoReady(page, '/id/apps')
    await open(page)
    await expect(page).toHaveURL(`${BASE}/id/apps/${SLUG}`)
    await expect(dialog(page).getByRole('button', { name: 'Tutup' })).toBeVisible()
    await expect(dialog(page).getByRole('link', { name: 'Lihat detail lengkap' })).toHaveAttribute(
      'href',
      `/id/apps/${SLUG}`,
    )
    await expect(dialog(page).getByRole('link', { name: 'Unduh di Google Play' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(`${BASE}/id/apps`)
  })

  test('mobile: bottom sheet docked to the bottom edge, full width', async ({ browser }) => {
    await withPage(
      browser,
      { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true },
      async (page) => {
        await gotoReady(page, '/apps')
        await card(page).tap()
        await expect(dialog(page)).toBeVisible()
        await expect(dialog(page).locator('h2')).toBeVisible()
        await page.waitForTimeout(400) // enter transition
        const box = await dialog(page).boundingBox()
        expect(box?.width).toBeCloseTo(375, 0)
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeCloseTo(812, 0)
      },
    )
  })

  test('reduced motion: content is never hidden by scroll-reveal and skeletons are static', async ({
    browser,
  }) => {
    await withPage(browser, { reducedMotion: 'reduce' }, async (page) => {
      await gotoReady(page, '/')
      const hiddenReveals = await page.evaluate(
        () =>
          [...document.querySelectorAll('.reveal')].filter(
            (el) => Number(getComputedStyle(el).opacity) < 1,
          ).length,
      )
      expect(hiddenReveals).toBe(0)
      await open(page)
      await expect(dialog(page)).toBeVisible()
    })
  })
})

test.describe('Quick view — endpoint contract', () => {
  test('returns a slim, localized payload for a published app', async ({ request }) => {
    const res = await request.get(`${BASE}/next/quick-view?slug=${SLUG}&locale=id`)
    expect(res.status()).toBe(200)
    expect(res.headers()['cache-control']).toContain('private')
    expect(res.headers()['x-robots-tag']).toBe('noindex')
    const body = await res.json()
    expect(body).toMatchObject({ slug: SLUG, name: NAME, status: 'live', statusLabel: 'LIVE' })
    expect(body.downloadsText).toMatch(/unduhan|Baru dirilis/)
    expect(body.screenshots.length).toBeLessThanOrEqual(4)
    expect(body.features.length).toBeLessThanOrEqual(4)
    expect(body).not.toHaveProperty('description')
    expect(body).not.toHaveProperty('id')
  })

  test('unknown slug → 404; invalid input → 400; wrong method → 405; no internals leak', async ({
    request,
  }) => {
    const unknown = await request.get(`${BASE}/next/quick-view?slug=does-not-exist&locale=en`)
    expect(unknown.status()).toBe(404)
    expect(await unknown.json()).toEqual({ error: 'not_found' })
    for (const query of [
      '',
      '?slug=Al-Quran&locale=en',
      '?slug=../../etc/passwd&locale=en',
      `?slug=${SLUG}&locale=fr`,
      `?slug=${'a'.repeat(120)}&locale=en`,
    ]) {
      const res = await request.get(`${BASE}/next/quick-view${query}`)
      expect(res.status()).toBe(400)
      expect(res.headers()['cache-control']).toBe('no-store')
      expect(await res.text()).not.toMatch(/stack|select |relation|payload/i)
    }
    const post = await request.post(`${BASE}/next/quick-view?slug=${SLUG}&locale=en`)
    expect(post.status()).toBe(405)
  })

  test('robots.txt still disallows /next/', async ({ request }) => {
    const res = await request.get(`${BASE}/robots.txt`)
    expect(await res.text()).toMatch(/Disallow: \/next\//)
  })
})
