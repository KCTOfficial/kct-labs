import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * Home scroll story (src/components/home/scrollStory.ts). Requires seeded content and a server on
 * :3000. Viewports are explicit: Playwright's default 1280×720 is below the pin height gate.
 */
const BASE = 'http://localhost:3000'
const DESKTOP = { width: 1440, height: 900 }
const IDENTITY = ['none', 'matrix(1, 0, 0, 1, 0, 0)']
const HERO = 'section[aria-labelledby="hero-title"]'

const storyOn = (page: Page) =>
  page.locator('html[data-scroll-story="on"]').waitFor({ state: 'attached', timeout: 15_000 })

const transformOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).transform)

const opacityOf = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)))

const scrollTo = (page: Page, y: number) =>
  page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)

const trackGeometry = (page: Page, name: string) =>
  page.evaluate((track) => {
    const el = document.querySelector<HTMLElement>(`[data-story-track="${track}"]`)
    const spacer = el?.querySelector<HTMLElement>('.story-spacer')
    return {
      top: Math.round((el?.getBoundingClientRect().top ?? 0) + window.scrollY),
      spacer: spacer?.offsetHeight ?? 0,
      header: Math.round(document.querySelector('header')?.getBoundingClientRect().height ?? 0),
    }
  }, name)

/** Captures every script body the page downloads (to prove GSAP is or isn't shipped). */
const collectScripts = (page: Page) => {
  const bodies: Promise<string>[] = []
  page.on('response', (res) => {
    if (res.request().resourceType() === 'script') bodies.push(res.text().catch(() => ''))
  })
  // `pin-spacer` is a ScrollTrigger class-name literal that survives minification.
  return async () => (await Promise.all(bodies)).some((body) => body.includes('pin-spacer'))
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

test.describe('Home scroll story — desktop', () => {
  test.use({ viewport: DESKTOP })

  test('hero is static: not sticky, no story parts, scrolls away normally', async ({ page }) => {
    const hasGsap = collectScripts(page)
    await page.goto(`${BASE}/`)
    await storyOn(page)
    // GSAP still ships for the other sections; the hero just no longer uses it.
    expect(await hasGsap()).toBe(true)
    await expect(page.locator('h1')).toHaveCount(1)

    const hero = page.locator(HERO)
    expect(await hero.evaluate((el) => getComputedStyle(el).position)).not.toBe('sticky')
    expect(await hero.evaluate((el) => el.querySelectorAll('[data-story-part]').length)).toBe(0)
    expect(await page.locator('[data-story-track="hero"], [data-story="hero"]').count()).toBe(0)

    const top0 = await hero.evaluate((el) => el.getBoundingClientRect().top)
    await scrollTo(page, 600)
    await expect
      .poll(async () => top0 - (await hero.evaluate((el) => el.getBoundingClientRect().top)), {
        timeout: 5_000,
      })
      .toBeGreaterThanOrEqual(599)
    const moved = top0 - (await hero.evaluate((el) => el.getBoundingClientRect().top))
    expect(moved).toBeLessThanOrEqual(601)
  })

  test('featured pins and lights its features up one by one, reversibly', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await storyOn(page)
    const { top, spacer, header } = await trackGeometry(page, 'featured')
    test.skip(spacer === 0, 'featured section not pinnable with the seeded content')
    // Badges light up in turn; the feature text itself always stays fully opaque (contrast).
    const features = '[data-story="featured"] [data-story-part="feature-badge"]'

    await scrollTo(page, top - header + Math.round(spacer / 2))
    await expect
      .poll(async () => (await opacityOf(page, features))[0], { timeout: 10_000 })
      .toBeCloseTo(1, 1)
    expect((await opacityOf(page, features)).at(-1)).toBeLessThan(1)
    // WCAG: feature rows and process steps (their text) are never dimmed.
    expect(await opacityOf(page, '[data-story-part="feature"]')).toEqual(
      [1, 1, 1].slice(0, (await opacityOf(page, '[data-story-part="feature"]')).length),
    )
    expect(new Set(await opacityOf(page, '[data-story-part="step"]'))).toEqual(new Set([1]))

    await scrollTo(page, top - header + spacer)
    await expect
      .poll(async () => Math.min(...(await opacityOf(page, features))), { timeout: 10_000 })
      .toBeCloseTo(1, 1)

    await scrollTo(page, top - 900)
    await expect
      .poll(() => opacityOf(page, '[data-story-part="featured-phone-primary"]'), {
        timeout: 10_000,
      })
      .toEqual([0])
  })

  test('leaving the home page tears everything down; Back re-enables it', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await storyOn(page)
    await page.locator('header nav').getByRole('link', { name: 'Apps', exact: true }).click()
    await expect(page.locator('h1')).toHaveText('All Apps')
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-story', /.*/)
    await expect(page.locator('.pin-spacer')).toHaveCount(0)
    await page.goBack()
    await storyOn(page)
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('anchors from another page land where the CSS puts them (story adds no offset)', async ({
    page,
  }) => {
    for (const [name, id] of [
      ['About', 'about'],
      ['Contact', 'contact'],
    ] as const) {
      await page.goto(`${BASE}/apps`)
      await page.locator('header nav').getByRole('link', { name, exact: true }).click()
      await expect(page).toHaveURL(`${BASE}/#${id}`)
      // Expected landing offset = html scroll-padding-top + section scroll-margin-top (pre-existing CSS).
      const expected = await page
        .locator(`#${id}`)
        .evaluate(
          (el) =>
            parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) +
            parseFloat(getComputedStyle(el).scrollMarginTop),
        )
      await expect
        .poll(() => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top), {
          timeout: 10_000,
        })
        .toBeCloseTo(expected, -1)
    }
  })

  test('quick view on the home page keeps the story alive', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await storyOn(page)
    await page.locator('html[data-qv-ready="true"]').waitFor({ state: 'attached' })
    const card = page.locator('article a[data-quick-view]').first()
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    const scrollBefore = await page.evaluate(() => window.scrollY)
    await card.click()
    await expect(page.locator('dialog.qv-dialog')).toBeVisible()
    await expect(page).toHaveURL(/\/apps\/[a-z0-9-]+$/)
    await expect(page.locator('html')).toHaveAttribute('data-scroll-story', 'on')
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(`${BASE}/`)
    await expect(page.locator('html')).toHaveAttribute('data-scroll-story', 'on')
  })

  test('keyboard focus always reveals the focused card', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await storyOn(page)
    await scrollTo(page, 0)
    const link = page.locator('[data-story-part="card"] a[data-quick-view]').last()
    await link.focus()
    await expect
      .poll(() => link.evaluate((el) => getComputedStyle(el.closest('[data-story-part]')!).opacity))
      .toBe('1')
  })

  test('print shows the static layout', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await storyOn(page)
    await scrollTo(page, 500)
    await page.emulateMedia({ media: 'print' })
    expect(
      await page
        .locator('.story-spacer')
        .first()
        .evaluate((el) => getComputedStyle(el).display),
    ).toBe('none')
    expect(IDENTITY).toContain(await transformOf(page, '[data-story-part="card"]'))
  })

  for (const viewport of [DESKTOP, { width: 1920, height: 1080 }]) {
    test(`no layout shift when the story starts (${viewport.width}×${viewport.height})`, async ({
      browser,
    }) => {
      await withPage(browser, { viewport }, async (page) => {
        await page.goto(`${BASE}/`)
        await storyOn(page)
        await page.waitForTimeout(1500)
        const cls = await page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              let total = 0
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries() as Array<
                  PerformanceEntry & { value: number; hadRecentInput: boolean }
                >) {
                  if (!entry.hadRecentInput) total += entry.value
                }
              }).observe({ type: 'layout-shift', buffered: true })
              setTimeout(() => resolve(total), 500)
            }),
        )
        expect(cls).toBeLessThan(0.01)
      })
    })
  }
})

test.describe('Home scroll story — light / disabled versions', () => {
  const expectStatic = async (page: Page, hasGsap: () => Promise<boolean>) => {
    await page.waitForTimeout(2500) // longer than the idle-load timeout
    expect(await hasGsap()).toBe(false)
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-story', /.*/)
    expect(
      await page
        .locator('.story-spacer')
        .first()
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBe(0)
    // The hero is never story-driven: no animated parts, whatever the mode.
    await expect(page.locator(`${HERO} [data-story-part]`)).toHaveCount(0)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toBeVisible()
  }

  test('mobile never downloads GSAP and is not pinned', async ({ browser }) => {
    await withPage(
      browser,
      { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
      async (page) => {
        const hasGsap = collectScripts(page)
        await page.goto(`${BASE}/`)
        await expectStatic(page, hasGsap)
      },
    )
  })

  test('reduced motion on desktop: no GSAP, no pin', async ({ browser }) => {
    await withPage(browser, { viewport: DESKTOP, reducedMotion: 'reduce' }, async (page) => {
      const hasGsap = collectScripts(page)
      await page.goto(`${BASE}/`)
      await expectStatic(page, hasGsap)
    })
  })

  test('short desktop viewport: story on, but no pin', async ({ browser }) => {
    await withPage(browser, { viewport: { width: 1440, height: 700 } }, async (page) => {
      await page.goto(`${BASE}/`)
      await storyOn(page)
      expect((await trackGeometry(page, 'featured')).spacer).toBe(0)
      expect(await page.locator(HERO).evaluate((el) => getComputedStyle(el).position)).not.toBe(
        'sticky',
      )
    })
  })

  test('resizing below and back above the breakpoint turns the story off and on', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/`)
    await storyOn(page)
    await page.setViewportSize({ width: 900, height: 900 })
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-story', /.*/)
    await page.setViewportSize(DESKTOP)
    await storyOn(page)
  })

  test('without JavaScript the home page is static and complete', async ({ browser }) => {
    await withPage(browser, { viewport: DESKTOP, javaScriptEnabled: false }, async (page) => {
      await page.goto(`${BASE}/`)
      expect(
        await page
          .locator('.story-spacer')
          .first()
          .evaluate((el) => el.getBoundingClientRect().height),
      ).toBe(0)
      expect(await page.locator(HERO).evaluate((el) => getComputedStyle(el).position)).not.toBe(
        'sticky',
      )
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('[data-story-part="card"]').first()).toBeVisible()
    })
  })
})
