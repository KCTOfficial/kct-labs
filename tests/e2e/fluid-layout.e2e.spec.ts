import { expect, test, type Page } from '@playwright/test'

/**
 * Fluid sizing on every public page (globals.css fluid tokens, HomeHero/HeroStage). Requires
 * seeded content and a server on :3000. Seeded media may 400 in dev, so nothing here asserts on
 * console errors or image loading; the app slug is discovered at runtime.
 */
const BASE = 'http://localhost:3000'

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  // Browser zoom equivalents of 1280×720: 125% and 150%.
  { width: 1024, height: 576 },
  { width: 853, height: 480 },
  // Tall but narrow desktop layout (portrait tablet): the stage is height-led, the column is not.
  { width: 1024, height: 1366 },
]

/** Sub-pixel rounding and rotated phone corners may poke out by a hair; never more. */
const TOLERANCE_PX = 1

const label = ({ width, height }: { width: number; height: number }) => `${width}×${height}`

/** Desktop layout (`lg`) starts here: the caption overlays the bottom of the stage. */
const LG_MIN_WIDTH = 1024
/** Header (79px) + 9rem + the 26rem stage minimum: from this height the whole carousel fits. */
const FITS_MIN_HEIGHT = 79 + 144 + 416
const STAGE_MIN_PX = 416
/** Same height gate as PIN_QUERY (scrollStoryConfig.ts): below it the featured section never pins. */
const PIN_MIN_HEIGHT = 760
/** The caption card may graze the centre phone's bottom edge (as in the design), never cover it. */
const CAPTION_OVERLAP_MAX_PX = 16

let appSlug: string | null = null
let legalIndex: string | null = null
let legalDoc: string | null = null

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto(`${BASE}/apps`)
  const slugs = await page.locator('main a[href^="/apps/"]').evaluateAll((links) => [
    ...new Set(
      links
        .map((link) => link.getAttribute('href') ?? '')
        .filter((value) => /^\/apps\/[a-z0-9-]+$/.test(value))
        .map((value) => value.replace('/apps/', '')),
    ),
  ])
  appSlug = slugs[0] ?? null
  // Not every app publishes legal documents: use the first listed app that does.
  for (const slug of slugs) {
    const response = await page.request.get(`${BASE}/apps/${slug}/legal`)
    if (response.status() !== 200) continue
    legalIndex = `/apps/${slug}/legal`
    await page.goto(`${BASE}${legalIndex}`)
    legalDoc =
      (await page
        .locator(`main a[href^="${legalIndex}/"]`)
        .first()
        .getAttribute('href')
        .catch(() => null)) ?? null
    break
  }
  await page.close()
})

const routes = () => {
  const list = ['/', '/apps', '/search', '/posts']
  if (appSlug) list.push(`/apps/${appSlug}`)
  if (legalIndex) list.push(legalIndex)
  if (legalDoc) list.push(legalDoc)
  return list
}

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

/** Hero elements whose box leaves the hero section (would be clipped or overflow). */
const clippedHeroElements = (page: Page) =>
  page.evaluate((tolerance) => {
    const section = document.querySelector('section[aria-labelledby="hero-title"]')
    if (!section) return ['missing hero section']
    const bounds = section.getBoundingClientRect()
    const out: string[] = []
    for (const el of section.querySelectorAll<HTMLElement>('*')) {
      // Decorative glows are allowed to bleed; screen layers slide inside the phone's own clip.
      if (el.closest('.pointer-events-none, .hero-track, .sr-only')) continue
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const isOutside =
        rect.left < bounds.left - tolerance ||
        rect.right > bounds.right + tolerance ||
        rect.top < bounds.top - tolerance ||
        rect.bottom > bounds.bottom + tolerance
      if (isOutside) {
        const name = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${String(el.className).slice(0, 40)}`
        out.push(
          `${name} [${Math.round(rect.left)},${Math.round(rect.top)},${Math.round(rect.right)},${Math.round(rect.bottom)}] vs section [${Math.round(bounds.left)},${Math.round(bounds.top)},${Math.round(bounds.right)},${Math.round(bounds.bottom)}]`,
        )
      }
    }
    return out
  }, TOLERANCE_PX)

test.describe('Fluid layout — no clipping, no horizontal scroll', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(label(viewport), () => {
      test.use({ viewport })

      test('home hero: nothing clipped, carousel inside the viewport, one h1', async ({ page }) => {
        await page.goto(`${BASE}/`)
        await expect(page.locator('h1')).toHaveCount(1)
        expect(await clippedHeroElements(page)).toEqual([])
        const carousel = page.locator('[data-hero-carousel]')
        test.skip((await carousel.count()) === 0, 'no app with screenshots: hero has no stage')
        const box = await carousel.evaluate((el) => {
          const rect = el.getBoundingClientRect()
          const stage = el.querySelector(':scope > [aria-hidden="true"]')!.getBoundingClientRect()
          const centre = el.querySelector('[data-hero-phone-link][data-slot="center"]')
          const card = el.querySelector('[data-hero-caption]')!.parentElement!
          return {
            right: rect.right,
            bottom: rect.bottom + window.scrollY,
            // Phones (incl. their rotation) stay inside the carousel box horizontally.
            phonesOutside: [...el.querySelectorAll('[data-hero-phone-link]')].filter((phone) => {
              const p = phone.getBoundingClientRect()
              return p.left < rect.left - 1 || p.right > rect.right + 1
            }).length,
            stageHeight: stage.height,
            centreBottom: centre ? centre.getBoundingClientRect().bottom : null,
            cardTop: card.getBoundingClientRect().top,
          }
        })
        expect(box.right).toBeLessThanOrEqual(viewport.width + TOLERANCE_PX)
        // Mobile poses deliberately tilt a few px past the box into the gutter (not clipped).
        if (viewport.width >= LG_MIN_WIDTH) expect(box.phonesOutside).toBe(0)
        if (box.centreBottom !== null) {
          expect(box.centreBottom - box.cardTop).toBeLessThanOrEqual(CAPTION_OVERLAP_MAX_PX)
        }
        if (viewport.width >= LG_MIN_WIDTH) {
          // Short screens: the stage shrinks to its minimum, then the hero scrolls (never clips).
          expect(box.stageHeight).toBeGreaterThanOrEqual(STAGE_MIN_PX - TOLERANCE_PX)
          if (viewport.height >= FITS_MIN_HEIGHT) {
            // Phones, caption and controls are all visible in the first screen.
            expect(box.bottom).toBeLessThanOrEqual(viewport.height + TOLERANCE_PX)
          }
        }
      })

      if (viewport.width >= LG_MIN_WIDTH && viewport.height >= PIN_MIN_HEIGHT) {
        test('pinned featured section fits the screen while stuck', async ({ page }) => {
          await page.goto(`${BASE}/`)
          const pinned = page.locator('section[aria-labelledby="featured-title"].story-pin')
          test.skip(
            (await pinned.count()) === 0,
            'featured section is not pinnable with this content',
          )
          await expect
            .poll(() => pinned.evaluate((el) => getComputedStyle(el).position))
            .toBe('sticky')
          const fit = await pinned.evaluate((el) => {
            const top = parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue('--story-top'),
            )
            return { height: el.getBoundingClientRect().height, room: window.innerHeight - top }
          })
          expect(fit.height).toBeLessThanOrEqual(fit.room + TOLERANCE_PX)
        })
      }

      test('public routes: no horizontal scroll and exactly one h1', async ({ page }) => {
        for (const route of routes()) {
          const response = await page.goto(`${BASE}${route}`)
          expect(response?.status(), route).toBeLessThan(400)
          expect(await horizontalOverflow(page), route).toBeLessThanOrEqual(0)
          await expect(page.locator('h1'), route).toHaveCount(1)
        }
      })
    })
  }

  test('app slug and legal routes are discoverable', async () => {
    expect(appSlug, 'no app card link on /apps').not.toBeNull()
    test.skip(!legalIndex, 'no listed app has a published legal index (/apps/<slug>/legal is 404)')
    expect(legalDoc, `no document link on ${legalIndex}`).not.toBeNull()
  })
})

test.describe('Fluid layout — stability', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('home CLS stays at most 0.1 at 1440×900', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await page.waitForLoadState('load')
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
    expect(cls).toBeLessThanOrEqual(0.1)
  })
})
