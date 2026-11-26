import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('can load homepage', async ({ page }) => {
    // Indonesian is the default locale (unprefixed); English lives under /en.
    await page.goto('http://localhost:3000')
    // The template homepage was replaced by the KCT Hub Home global (see kct-hub.e2e.spec.ts).
    await expect(page).toHaveTitle(/KCT Hub/)
    await expect(page.locator('h1').first()).toHaveText(
      'Aplikasi buatan KCT untuk keseharian dan bisnis Anda.',
    )
    await page.goto('http://localhost:3000/en')
    await expect(page).toHaveTitle(/KCT Hub/)
    const heading = page.locator('h1').first()
    await expect(heading).toHaveText('Apps built by KCT for your everyday life and business.')
  })
})
