import { expect, test } from '@playwright/test'
import { BASE } from '../helpers/e2eApps'

/**
 * The phone mockup keeps the same look at every size: bezel and corner radius are shares of the
 * frame (regression: fixed 38px / 8px made small phones look like toys).
 */
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]

test.describe('Phone frame proportions', () => {
  for (const viewport of VIEWPORTS) {
    test(`hero phones keep bezel and radius ratios at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(`${BASE}/`)
      const phones = page.locator('[data-hero-phone-link] [data-phone-frame]')
      await expect(phones.first()).toBeVisible()

      const measured = await phones.evaluateAll((frames) =>
        frames.map((frame) => {
          const outer = frame.getBoundingClientRect()
          const screen = frame.querySelector('[data-phone-screen]')!.getBoundingClientRect()
          const style = getComputedStyle(frame)
          return {
            bezelX: (screen.left - outer.left) / outer.width,
            bezelY: (screen.top - outer.top) / outer.height,
            radius: `${style.borderTopLeftRadius}|${style.borderTopRightRadius}`,
            width: outer.width,
          }
        }),
      )

      expect(measured.length).toBeGreaterThan(0)
      for (const m of measured) {
        // 3.08% + the 1px hairline: ≤ 4.5% even on the smallest phone, never the old 8px / ~6%.
        expect(m.bezelX).toBeGreaterThan(0.03)
        expect(m.bezelX).toBeLessThan(0.045)
        expect(m.bezelY).toBeGreaterThan(0.014)
        expect(m.bezelY).toBeLessThan(0.025)
        expect(m.radius).toBe('14.6% 7.04%|14.6% 7.04%')
        expect(m.width).toBeGreaterThan(60)
      }
    })
  }
})
