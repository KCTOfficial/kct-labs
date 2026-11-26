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

const phoneLinks = (page: Page) => page.locator('[data-hero-phone-link]')
const fill = (page: Page) => page.getByTestId('hero-progress-fill')
const fillWidth = (page: Page) =>
  fill(page).evaluate((el) => Math.round(el.getBoundingClientRect().width))

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
    const links = phoneLinks(page)
    await expect(links).toHaveCount(3)
    const centre = await hrefOf(page, 'center')
    expect(centre).toMatch(/^\/apps\/[a-z0-9-]+$/)
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('aria-hidden', 'true')
      await expect(link).toHaveAttribute('tabindex', '-1')
      await expect(link).toHaveAttribute('href', centre!)
    }
    await expect(captionLink(page)).toHaveAttribute('href', centre!)
    await expect(page.locator('[data-hero-caption-text]')).not.toBeEmpty()
  })

  test('three phones belong to one app (alt text names the same app)', async ({ page }) => {
    await page.goto(`${BASE}/`)
    const name = (await captionLink(page).textContent())!.trim()
    expect(name.length).toBeGreaterThan(0)
    const alts = await page
      .locator('[data-hero-phone-link] [data-role="cur"] img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('alt') ?? ''))
    expect(alts).toHaveLength(3)
    for (const alt of alts) expect(alt).toContain(name)
    expect(new Set(alts).size).toBe(3) // three different screenshots, not one repeated
    // Content of the active app is server-rendered.
    const html = await (await page.request.get(`${BASE}/`)).text()
    expect(html).toContain(name)
  })

  test('one progress segment per app, the active one filling in orange', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await ready(page)
    const total = Number(await group(page).getAttribute('data-count'))
    const segments = page.locator('[data-hero-progress] button')
    await expect(segments).toHaveCount(total)
    await expect(segments.first()).toHaveAttribute('aria-current', 'true')
    await expect(segments.first()).toHaveAttribute('aria-label', /^Tampilkan .+/)
    await expect(fill(page)).toHaveCount(1)
    const colours = await fill(page).evaluate((el) => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--accent-orange)'
      document.body.append(probe)
      const expected = getComputedStyle(probe).color
      probe.remove()
      return { actual: getComputedStyle(el).backgroundColor, expected }
    })
    expect(colours.actual).toBe(colours.expected)
  })

  test('clicking a segment shows that app', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await ready(page)
    const segments = page.locator('[data-hero-progress] button')
    const target = segments.nth(1)
    const label = (await target.getAttribute('aria-label'))!
    await target.click()
    await settled(page)
    expect(await activeIndex(page)).toBe(1)
    await expect(target).toHaveAttribute('aria-current', 'true')
    await expect(captionLink(page)).toHaveText(label.replace(/^Tampilkan /, ''))
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
      await expect(page.getByRole('button', { name: 'Aplikasi berikutnya' })).toBeHidden()
    } finally {
      await context.close()
    }
  })

  test('next shows the next app on every phone, prev moves it back, and it wraps', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`)
    await ready(page)
    const startCentre = await hrefOf(page, 'center')

    await page.getByRole('button', { name: 'Aplikasi berikutnya' }).click()
    await settled(page)
    const nextCentre = await hrefOf(page, 'center')
    expect(nextCentre).not.toBe(startCentre)
    await expect(captionLink(page)).toHaveAttribute('href', nextCentre!)
    for (const link of await phoneLinks(page).all()) {
      await expect(link).toHaveAttribute('href', nextCentre!)
    }

    await page.getByRole('button', { name: 'Aplikasi sebelumnya' }).click()
    await settled(page)
    expect(await hrefOf(page, 'center')).toBe(startCentre)

    const total = Number(await group(page).getAttribute('data-count'))
    for (let i = 0; i < total; i++) {
      await page.getByRole('button', { name: 'Aplikasi berikutnya' }).click()
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
    await page.getByRole('button', { name: 'Aplikasi berikutnya' }).evaluate((button) => {
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
        (b) => b.getAttribute('aria-label') === 'Aplikasi berikutnya',
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

  test('each phone links to the detail page of the app on stage', async ({ page }) => {
    for (const slot of ['left', 'center', 'right'] as const) {
      await page.goto(`${BASE}/`)
      const href = await hrefOf(page, slot)
      await expect(captionLink(page)).toHaveAttribute('href', href!)
      await phoneLink(page, slot).click()
      // Generous timeout: the first visit of /apps/<slug> compiles the route on a fresh dev server.
      await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 30_000 })
    }
  })

  test('phone links keep the locale prefix in English', async ({ page }) => {
    await page.goto(`${BASE}/en`)
    for (const slot of ['left', 'center', 'right'] as const) {
      await expect(phoneLink(page, slot)).toHaveAttribute('href', /^\/en\/apps\/[a-z0-9-]+$/)
    }
    await ready(page)
    await expect(page.getByRole('button', { name: 'Next app' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous app' })).toBeVisible()
  })

  test('hovering a phone shows a pointer cursor', async ({ page }) => {
    await page.goto(`${BASE}/`)
    const cursor = await phoneLink(page, 'center').evaluate((el) => getComputedStyle(el).cursor)
    expect(cursor).toBe('pointer')
  })

  test('the hero phones carry no scroll-story part nodes', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await expect(page.locator('[data-hero-phone-link]')).toHaveCount(3)
    await expect(
      page.locator('section[aria-labelledby="hero-title"] [data-story-part]'),
    ).toHaveCount(0)
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
const nextButton = (page: Page) => page.getByRole('button', { name: 'Aplikasi berikutnya' })
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

  test('there is no pause button and hover freezes the fill instead of resetting it', async ({
    page,
  }) => {
    const start = await open(page)
    await expect(page.getByRole('button', { name: /slideshow/i })).toHaveCount(0)
    await page.waitForTimeout(1500)
    await group(page).hover()
    const frozen = await fillWidth(page)
    expect(frozen).toBeGreaterThan(0)
    await page.waitForTimeout(1000)
    expect(Math.abs((await fillWidth(page)) - frozen)).toBeLessThanOrEqual(2)
    expect(await activeIndex(page)).toBe(start)
    // Live region stays quiet while autoplay runs and announces while it is stopped.
    await expect(page.locator('[data-hero-carousel] [aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    )
    await parkMouse(page)
    // Resumes where it stopped (grows from the frozen width, never back to zero).
    await expect.poll(() => fillWidth(page), { timeout: 2000 }).toBeGreaterThan(frozen + 2)
    await expect(page.locator('[data-hero-carousel] [aria-live]')).toHaveAttribute(
      'aria-live',
      'off',
    )
  })

  test('one full fill steps exactly one app', async ({ page }) => {
    const start = await open(page)
    const n = await total(page)
    await expect.poll(() => activeIndex(page), { timeout: STEP_TIMEOUT }).toBe((start + 1) % n)
    // The next fill starts from zero: no second step follows right away.
    await page.waitForTimeout(2500)
    expect(await activeIndex(page)).toBe((start + 1) % n)
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

  test('reduced motion: no autoplay, a static full segment, manual steps are instant', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const start = await open(page)
    const n = await total(page)
    await expect(page.getByRole('button', { name: /slideshow/i })).toHaveCount(0)
    const track = await fill(page).evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        animation: style.animationName,
        width: Math.round(el.getBoundingClientRect().width),
        trackWidth: Math.round(el.parentElement!.getBoundingClientRect().width),
      }
    })
    expect(track.animation).toBe('none')
    expect(track.width).toBe(track.trackWidth)
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
    // Keep autoplay out of the way: these tests are about the gesture only. There is no pause
    // button any more, so stop the fill clock (the only autoplay timer) for this page.
    await page.addStyleTag({
      content: '.hero-progress-fill { animation-play-state: paused !important; }',
    })
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

  test('the phone area pans vertically but still allows pinch-zoom (WCAG 1.4.4)', async ({
    page,
  }) => {
    await open(page)
    const touchAction = await stageArea(page).evaluate((el) => getComputedStyle(el).touchAction)
    expect(touchAction).toBe('pan-y pinch-zoom')
  })
})

test.describe('Home hero carousel — caption layout (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the caption keeps one fixed height whatever its content (no layout shift per step)', async ({
    page,
  }) => {
    await page.goto(`${BASE}/`)
    await ready(page)
    const wrapper = page.locator('[data-hero-caption]').locator('xpath=..')
    const height = async () => Math.round((await wrapper.boundingBox())!.height)
    const baseline = await height()
    // Worst case: a long wrapping name and a description far over three lines.
    await page.evaluate(() => {
      document.querySelector('[data-hero-caption-link]')!.textContent =
        'An unusually long application name that wraps over several lines on a phone'
      document.querySelector('[data-hero-caption-text]')!.textContent =
        'Lorem ipsum dolor sit amet '.repeat(12)
    })
    expect(await height()).toBe(baseline)
  })
})
