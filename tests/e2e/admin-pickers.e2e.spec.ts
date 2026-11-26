import { expect, test, type Page } from '@playwright/test'

import {
  BASE,
  CLEANUP_TIMEOUT,
  createApp,
  setupE2e,
  teardownE2e,
  type E2eContext,
} from '../helpers/e2eApps'
import { login } from '../helpers/login'
import { testUser } from '../helpers/seedUser'

/**
 * Admin: the icon popup picker and the accent colour swatches on the Apps edit page. Creates its own
 * uniquely-named app over REST and removes it afterwards.
 */
const suffix = `e2ep-${Date.now().toString(36)}`

test.describe('Admin pickers (apps)', () => {
  test.describe.configure({ mode: 'serial' })

  let ctx: E2eContext
  let app: { id: number; slug: string }
  let page: Page

  test.beforeAll(async ({ browser, playwright }) => {
    test.setTimeout(300_000)
    ctx = await setupE2e(playwright, suffix)
    app = await createApp(ctx, 'Picker App')
    page = await (await browser.newContext()).newPage()
    await login({ page, user: testUser })
  })

  test.afterAll(async ({ playwright }) => {
    test.setTimeout(CLEANUP_TIMEOUT)
    await page?.context().close()
    await teardownE2e(playwright, ctx)
  })

  const savedDoc = async () => {
    const res = await ctx.request.get(`${BASE}/api/apps/${app.id}?depth=0&draft=false`, {
      headers: { Authorization: `JWT ${ctx.token}` },
    })
    return (await res.json()) as {
      accentColor?: string | null
      highlights?: Array<{ icon?: string | null; title?: string }>
      features?: Array<{ icon?: string | null }>
    }
  }

  test('accent swatches: pick, switch and clear; the choice is saved', async () => {
    test.setTimeout(300_000)
    await page.goto(`${BASE}/admin/collections/apps/${app.id}`, { timeout: 120_000 })
    const group = page.getByRole('radiogroup', { name: 'Accent colour' })
    await expect(group).toBeVisible({ timeout: 120_000 })
    await expect(group.getByRole('radio')).toHaveCount(13) // 12 presets + brand
    await expect(group.getByRole('radio', { name: /Brand/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    // The admin is server-rendered first: a click before React hydrates is lost, so retry the first one.
    await expect(async () => {
      await group.getByRole('radio', { name: 'Green' }).click()
      await expect(group.getByRole('radio', { name: 'Green' })).toHaveAttribute(
        'aria-checked',
        'true',
        { timeout: 1_500 },
      )
    }).toPass({ timeout: 60_000 })
    await group.getByRole('radio', { name: 'Purple' }).click()
    await expect(group.getByRole('radio', { name: 'Green' })).toHaveAttribute(
      'aria-checked',
      'false',
    )

    await page.locator('#action-save').click()
    await expect.poll(async () => (await savedDoc()).accentColor).toBe('purple')
  })

  test('icon picker: open, search by meaning, choose, close with Escape, save', async () => {
    test.setTimeout(300_000)
    await page.goto(`${BASE}/admin/collections/apps/${app.id}`, { timeout: 120_000 })
    const trigger = page.locator('.icon-picker button').first()
    // Retry the tab switch until the server-rendered admin has hydrated (earlier clicks are lost).
    const tab = page.locator('.tabs-field__tab-button', { hasText: 'Page sections' })
    await expect(async () => {
      await tab.click()
      await expect(tab).toHaveClass(/tabs-field__tab-button--active/, { timeout: 2_000 })
    }).toPass({ timeout: 90_000 })
    await page.getByRole('button', { name: /Add Highlight/i }).click()
    await expect(trigger).toBeVisible()
    await expect(trigger).toContainText('Choose icon')
    await trigger.click()
    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible()

    // Escape closes without choosing.
    await page.keyboard.press('Escape')
    await expect(listbox).toBeHidden()
    await expect(trigger).toContainText('Choose icon')

    await trigger.click()
    await page.getByLabel('Search icons').fill('uang') // Indonesian keyword for money
    await expect(page.getByRole('option', { name: 'wallet' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'workflow' })).toHaveCount(0)
    await page.getByRole('option', { name: 'wallet' }).click()
    await expect(listbox).toBeHidden()
    await expect(trigger).toContainText('wallet')

    await page.locator('#field-highlights__0__title').fill('Offline ready')
    await page.locator('#action-save').click()
    await expect
      .poll(async () => (await savedDoc()).highlights?.[0]?.icon, { timeout: 30_000 })
      .toBe('wallet')
    expect((await savedDoc()).accentColor).toBe('purple') // earlier choice untouched
  })

  test('key features live in Page sections: icon, name and short line per row, titled by the name', async () => {
    test.setTimeout(300_000)
    await page.goto(`${BASE}/admin/collections/apps/${app.id}`, { timeout: 120_000 })
    // Retry the tab switch until the server-rendered admin has hydrated (earlier clicks are lost).
    const tab = page.locator('.tabs-field__tab-button', { hasText: 'Page sections' })
    await expect(async () => {
      await tab.click()
      await expect(tab).toHaveClass(/tabs-field__tab-button--active/, { timeout: 2_000 })
    }).toPass({ timeout: 90_000 })
    await page.getByRole('button', { name: /Add Feature/i }).click()

    const row = page.locator('#features-row-0')
    await expect(row.locator('.section-row-label')).toContainText('Feature') // empty row: fallback title
    await row.locator('.icon-picker button').first().click()
    // Other pickers on the page (highlights) keep their closed modal in the DOM: use the visible one.
    await page.locator('input.icon-picker__search:visible').fill('anggaran')
    await page.getByRole('option', { name: 'wallet' }).click()
    await page.locator('#field-features__0__label').fill('Perencanaan anggaran')
    await page.locator('#field-features__0__description').fill('Atur dan pantau')
    await expect(row.locator('.section-row-label')).toContainText('01')
    await expect(row.locator('.section-row-label')).toContainText('Perencanaan anggaran')

    await page.locator('#action-save').click()
    await expect
      .poll(async () => (await savedDoc()).features?.[0]?.icon, { timeout: 30_000 })
      .toBe('wallet')
    const saved = (await savedDoc()).features?.[0] as { description?: string } | undefined
    expect(saved?.description).toBe('Atur dan pantau')
  })

  test('icon picker: an optional icon can be cleared again', async () => {
    test.setTimeout(300_000)
    await page.goto(`${BASE}/admin/collections/apps/${app.id}`, { timeout: 120_000 })
    const trigger = page.locator('.icon-picker button').first()
    await expect(async () => {
      const tab = page.locator('.tabs-field__tab-button', { hasText: 'Page sections' })
      await tab.click()
      await expect(tab).toHaveClass(/tabs-field__tab-button--active/, { timeout: 2_000 })
      await expect(trigger).toBeVisible({ timeout: 5_000 })
    }).toPass({ timeout: 90_000 })
    await expect(trigger).toContainText('wallet')
    await trigger.click()
    await page.getByRole('button', { name: 'Clear selection' }).click()
    await expect(trigger).toContainText('Choose icon')
    await page.locator('#action-save').click()
    await expect
      .poll(async () => (await savedDoc()).highlights?.[0]?.icon ?? null, { timeout: 30_000 })
      .toBeNull()
  })
})
