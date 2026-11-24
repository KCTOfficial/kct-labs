import { expect, test, type Page } from '@playwright/test'

/**
 * Home hero phone carousel (src/components/home/HeroStage.tsx). Requires seeded content and a
 * server on :3000. Viewport is explicit (desktop 1440×900) like home-scroll-story.
 */
const BASE = 'http://localhost:3000'
const DESKTOP = { width: 1440, height: 900 }

const group = (page: Page) => page.locator('[data-hero-carousel]')
const phoneLink = (page: Page, slot: 'left' | 'center' | 'right') =>
  page.locator(`[data-hero-phone-link][data-slot="${slot}"]`)
const captionLink = (page: Page) => page.locator('[data-hero-caption-link]')
const hrefOf = (page: Page, slot: 'left' | 'center' | 'right') =>
  phoneLink(page, slot).getAttribute('href')

const ready = async (page: Page) => {
  await expect(group(page)).toHaveAttribute('data-ready', 'true', { timeout: 15_000 })
}
const settled = (page: Page) => expect(group(page)).toHaveAttribute('data-animating', 'false')
const activeIndex = async (page: Page) =>
  Number(await group(page).getAttribute('data-active-index'))

test.describe('Home hero carousel — desktop', () => {
  test.use({ viewport: DESKTOP })

  test('SSR: centre phone and caption agree, phone links are decorative', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await expect(page.locator('h1')).toHaveCount(1)
    const links = page.locator('[data-hero-phone-link]')
    await expect(links).toHaveCount(3)
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('aria-hidden', 'true')
      await expect(link).toHaveAttribute('tabindex', '-1')
    }
    const centre = await hrefOf(page, 'center')
    expect(centre).toMatch(/^\/apps\/[a-z0-9-]+$/)
    await expect(captionLink(page)).toHaveAttribute('href', centre!)
    await expect(page.locator('[data-hero-caption-text]')).not.toBeEmpty()
  })

  test('without JavaScript the caption and phone links work and buttons stay hidden', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: DESKTOP, javaScriptEnabled: false })
    const page = await context.newPage()
    try {
      await page.goto(`${BASE}/`)
      await expect(captionLink(page)).toBeVisible()
      await expect(phoneLink(page, 'center')).toHaveAttribute('href', /\/apps\//)
      await expect(page.getByRole('button', { name: 'Next app' })).toBeHidden()
    } finally {
      await context.close()
    }
  })

  test('next moves the right app to the centre, prev moves it back, and it wraps', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`)
    await ready(page)
    const startCentre = await hrefOf(page, 'center')
    const right = await hrefOf(page, 'right')

    await page.getByRole('button', { name: 'Next app' }).click()
    await settled(page)
    expect(await hrefOf(page, 'center')).toBe(right)
    await expect(captionLink(page)).toHaveAttribute('href', right!)

    await page.getByRole('button', { name: 'Previous app' }).click()
    await settled(page)
    expect(await hrefOf(page, 'center')).toBe(startCentre)

    const count = await page.locator('[data-hero-phone-link]').count()
    const total = Number(await group(page).getAttribute('data-count'))
    expect(total).toBeGreaterThanOrEqual(count)
    for (let i = 0; i < total; i++) {
      await page.getByRole('button', { name: 'Next app' }).click()
      await settled(page)
    }
    expect(await hrefOf(page, 'center')).toBe(startCentre)
  })

  test('clicks that land mid-transition are ignored (exactly one step)', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
    await page.goto(`${BASE}/`)
    await ready(page)
    const before = await activeIndex(page)
    const total = Number(await group(page).getAttribute('data-count'))
    // Three synchronous clicks: the first starts the slide, the others must be dropped.
    await page.getByRole('button', { name: 'Next app' }).evaluate((button) => {
      ;(button as HTMLButtonElement).click()
      ;(button as HTMLButtonElement).click()
      ;(button as HTMLButtonElement).click()
    })
    await settled(page)
    expect(await activeIndex(page)).toBe((before + 1) % total)
    expect(errors).toEqual([])
  })

  test('screens slide through intermediate positions instead of jumping', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await ready(page)
    const { samples, width } = await page.evaluate(async () => {
      const track = document.querySelector('.hero-track[data-slot="center"]')!
      const next = [...document.querySelectorAll('button')].find(
        (b) => b.getAttribute('aria-label') === 'Next app',
      )!
      const out: number[] = []
      next.click()
      const end = performance.now() + 1200
      await new Promise<void>((resolve) => {
        const tick = () => {
          out.push(new DOMMatrixReadOnly(getComputedStyle(track).transform).m41)
          if (performance.now() < end) requestAnimationFrame(tick)
          else resolve()
        }
        tick()
      })
      return { samples: out, width: track.getBoundingClientRect().width }
    })
    // Travels towards -width through in-between values, then resets to 0 once committed.
    expect(samples.some((x) => x < -1 && x > -(width - 1))).toBe(true)
    expect(Math.min(...samples)).toBeLessThanOrEqual(-(width - 2))
    expect(samples.at(-1)).toBe(0)
    const travelling = samples.slice(0, samples.indexOf(Math.min(...samples)) + 1)
    expect(travelling.every((x, i) => i === 0 || x <= travelling[i - 1]! + 0.01)).toBe(true)
  })

  test('each phone links to its own detail page', async ({ page }) => {
    for (const slot of ['left', 'center', 'right'] as const) {
      await page.goto(`${BASE}/`)
      const href = await hrefOf(page, slot)
      await phoneLink(page, slot).click()
      // Generous timeout: the first visit of /apps/<slug> compiles the route on a fresh dev server.
      await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 30_000 })
    }
  })

  test('phone links keep the locale prefix in Indonesian', async ({ page }) => {
    await page.goto(`${BASE}/id`)
    for (const slot of ['left', 'center', 'right'] as const) {
      await expect(phoneLink(page, slot)).toHaveAttribute('href', /^\/id\/apps\/[a-z0-9-]+$/)
    }
    await ready(page)
    await expect(page.getByRole('button', { name: 'Aplikasi berikutnya' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aplikasi sebelumnya' })).toBeVisible()
  })

  test('hovering a phone shows a pointer cursor', async ({ page }) => {
    await page.goto(`${BASE}/`)
    const cursor = await phoneLink(page, 'center').evaluate((el) => getComputedStyle(el).cursor)
    expect(cursor).toBe('pointer')
  })

  test('GSAP part nodes for the three phones are still present', async ({ page }) => {
    await page.goto(`${BASE}/`)
    for (const slot of ['left', 'center', 'right']) {
      await expect(page.locator(`[data-story-part="phone-${slot}"]`)).toHaveCount(1)
    }
  })
})

/**
 * Autoplay runs on real time (5 s per step, plus the 0.67 s slide). Fake clocks risk stalling
 * hydration, so each test polls with generous timeouts. Keep them serial: parallel browsers starve
 * each other's timers and make the 5 s countdowns unreliable.
 */
const STEP_TIMEOUT = 10_000
const QUIET_MS = 6_500
const total = async (page: Page) => Number(await group(page).getAttribute('data-count'))
const nextButton = (page: Page) => page.getByRole('button', { name: 'Next app' })
const parkMouse = (page: Page) => page.mouse.move(2, 2)
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((value) => {
    if (value) {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      })
    } else {
      delete (document as unknown as Record<string, unknown>).hidden
      delete (document as unknown as Record<string, unknown>).visibilityState
    }
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)

test.describe('Home hero carousel — autoplay', () => {
  test.use({ viewport: DESKTOP })

  const open = async (page: Page) => {
    await page.goto(`${BASE}/`)
    await ready(page)
    await parkMouse(page)
    return activeIndex(page)
  }

  test('advances by itself about every five seconds', async ({ page }) => {
    const start = await open(page)
    const n = await total(page)
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).toBe((start + 1) % n)
  })

  test('hover pauses it and leaving resumes it', async ({ page }) => {
    const start = await open(page)
    const n = await total(page)
    await group(page).hover()
    await page.waitForTimeout(QUIET_MS)
    expect(await activeIndex(page)).toBe(start)
    await parkMouse(page)
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).toBe((start + 1) % n)
  })

  test('keyboard focus pauses it, but a mouse click on a button does not pause it for good', async ({
    page,
  }) => {
    const start = await open(page)
    const n = await total(page)
    await page.keyboard.press('Tab')
    await nextButton(page).focus()
    await page.waitForTimeout(QUIET_MS)
    expect(await activeIndex(page)).toBe(start)
    await nextButton(page).blur()

    // Mouse click (focus stays on the button, but it is not keyboard focus) then leave.
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).not.toBe(start)
    const afterAuto = await activeIndex(page)
    await nextButton(page).click()
    await settled(page)
    await parkMouse(page)
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).toBe((afterAuto + 2) % n)
  })

  test('the pause button stops and restarts it', async ({ page }) => {
    const start = await open(page)
    const n = await total(page)
    await page.getByRole('button', { name: 'Pause slideshow' }).click()
    await parkMouse(page)
    await expect(page.getByRole('button', { name: 'Start slideshow' })).toBeVisible()
    await page.waitForTimeout(QUIET_MS)
    expect(await activeIndex(page)).toBe(start)
    await page.getByRole('button', { name: 'Start slideshow' }).click()
    await parkMouse(page)
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).toBe((start + 1) % n)
  })

  test('a manual step restarts the countdown', async ({ page }) => {
    const start = await open(page)
    const n = await total(page)
    await page.waitForTimeout(3000)
    await nextButton(page).click()
    await settled(page)
    await parkMouse(page)
    expect(await activeIndex(page)).toBe((start + 1) % n)
    // A fresh 5 s countdown: nothing moves for the next 3 s…
    await page.waitForTimeout(3000)
    expect(await activeIndex(page)).toBe((start + 1) % n)
    // …then the automatic step follows.
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).toBe((start + 2) % n)
  })

  test('reduced motion: no autoplay, no pause button, manual steps are instant', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const start = await open(page)
    const n = await total(page)
    await expect(page.getByRole('button', { name: 'Pause slideshow' })).toHaveCount(0)
    await page.waitForTimeout(QUIET_MS)
    expect(await activeIndex(page)).toBe(start)
    await nextButton(page).click()
    await expect(group(page)).toHaveAttribute('data-animating', 'false')
    expect(await activeIndex(page)).toBe((start + 1) % n)
  })

  test('a hidden tab does not advance or queue steps, and resumes when visible', async ({
    page,
  }) => {
    const start = await open(page)
    const n = await total(page)
    await setHidden(page, true)
    await page.waitForTimeout(QUIET_MS)
    expect(await activeIndex(page)).toBe(start)
    await setHidden(page, false)
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).toBe((start + 1) % n)
    // No burst of queued ticks: it is one step, then it settles.
    await settled(page)
    expect(await activeIndex(page)).toBe((start + 1) % n)
  })

  test('scrolled out of view it stops, and resumes when back on screen', async ({ page }) => {
    const start = await open(page)
    const n = await total(page)
    await page.evaluate(() => window.scrollTo({ top: 4000, behavior: 'instant' }))
    await page.waitForTimeout(QUIET_MS)
    expect(await activeIndex(page)).toBe(start)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).toBe((start + 1) % n)
  })

  test('navigating away and back leaves no errors and a working carousel', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
    page.on('pageerror', (error) => errors.push(error.message))
    await open(page)
    await phoneLink(page, 'center').click()
    await expect(page).toHaveURL(/\/apps\/[a-z0-9-]+$/, { timeout: 30_000 })
    await page.goBack()
    await ready(page)
    await parkMouse(page)
    const before = await activeIndex(page)
    const n = await total(page)
    await nextButton(page).click()
    await settled(page)
    expect(await activeIndex(page)).toBe((before + 1) % n)
    expect(errors).toEqual([])
  })
})

test.describe('Home hero carousel — touch swipe', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  const stageArea = (page: Page) => page.locator('[data-hero-carousel] > [aria-hidden="true"]')

  /** Real touch gesture through CDP so the browser's own pointer/touch-action rules apply. */
  const drag = async (page: Page, dx: number, dy: number) => {
    const box = (await stageArea(page).boundingBox())!
    const x = box.x + box.width / 2
    const y = box.y + 60
    const cdp = await page.context().newCDPSession(page)
    const point = (px: number, py: number) => [{ x: px, y: py, id: 1 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(x, y) })
    for (let step = 1; step <= 6; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: point(x + (dx * step) / 6, y + (dy * step) / 6),
      })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  }

  const open = async (page: Page) => {
    await page.goto(`${BASE}/`)
    await ready(page)
    // Keep autoplay out of the way: these tests are about the gesture only.
    await page.getByRole('button', { name: 'Pause slideshow' }).tap()
    return { start: await activeIndex(page), n: await total(page) }
  }

  test('swiping left goes to the next app, right to the previous one, and the URL stays', async ({
    page,
  }) => {
    const { start, n } = await open(page)
    await drag(page, -90, 4)
    await settled(page)
    expect(await activeIndex(page)).toBe((start + 1) % n)
    await drag(page, 90, 4)
    await settled(page)
    expect(await activeIndex(page)).toBe(start)
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('short drags and vertical drags do not change the app', async ({ page }) => {
    const { start } = await open(page)
    await drag(page, -20, 0)
    await drag(page, -10, 120)
    await page.waitForTimeout(900)
    expect(await activeIndex(page)).toBe(start)
  })

  test('a second swipe during the slide is ignored', async ({ page }) => {
    const { start, n } = await open(page)
    await drag(page, -90, 0)
    await drag(page, -90, 0)
    await settled(page)
    expect(await activeIndex(page)).toBe((start + 1) % n)
  })

  test('a click right after a swipe never reaches the phone link', async ({ page }) => {
    await open(page)
    await drag(page, -90, 0)
    const reached = await phoneLink(page, 'center').evaluate((link) => {
      let received = false
      link.addEventListener('click', (event) => {
        received = true
        event.preventDefault()
      })
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      return received
    })
    expect(reached).toBe(false)
  })

  test('a plain tap on a phone opens its detail page', async ({ page }) => {
    await open(page)
    const href = await hrefOf(page, 'center')
    await phoneLink(page, 'center').tap()
    await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 30_000 })
  })

  test('the phone area only lets the browser pan vertically', async ({ page }) => {
    await open(page)
    const touchAction = await stageArea(page).evaluate((el) => getComputedStyle(el).touchAction)
    expect(touchAction).toBe('pan-y')
  })
})
