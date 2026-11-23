import { test, expect, Page } from '@playwright/test'
import path from 'path'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/users')
    const listViewArtifact = page.locator('h1', { hasText: 'Users' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/pages/create')
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="title"]')
    await expect(editViewArtifact).toBeVisible()
  })
})

test.describe('legal documents', () => {
  test.describe.configure({ mode: 'serial' })

  const BASE = 'http://localhost:3000'
  const suffix = Date.now().toString(36)
  const APP_SLUG = `admin-legal-${suffix}`
  const TERMS_TITLE = `Admin Terms ${suffix}`
  const PRIVACY_TITLE = `Admin Privacy ${suffix}`
  const FIXTURES = path.resolve('tests/e2e/fixtures')
  const created: Array<{ collection: string; id: number }> = []
  let page: Page
  let token = ''
  let appId = 0

  const auth = () => ({ Authorization: `JWT ${token}` })

  test.beforeAll(async ({ browser, playwright }) => {
    test.setTimeout(180_000)
    const request = await playwright.request.newContext()
    const restLogin = async () => {
      const res = await request.post(`${BASE}/api/users/login`, { data: testUser })
      return res.ok() ? ((await res.json()) as { token: string }) : null
    }
    let session = await restLogin()
    if (!session) {
      // Seed in-process only after the dev server answered (its schema push is done).
      expect((await request.get(`${BASE}/api/apps?limit=1`)).ok()).toBe(true)
      await seedTestUser()
      session = await restLogin()
      if (!session) throw new Error('Test user login failed')
    }
    token = session.token

    const create = async (collection: string, data: Record<string, unknown>) => {
      const res = await request.post(`${BASE}/api/${collection}?locale=en`, {
        data,
        headers: auth(),
      })
      expect(res.ok(), `${collection}: ${await res.text()}`).toBe(true)
      const { doc } = (await res.json()) as { doc: { id: number } }
      created.unshift({ collection, id: doc.id })
      return doc
    }
    const media = await request.get(`${BASE}/api/media?limit=1&depth=0`, { headers: auth() })
    const mediaId = ((await media.json()) as { docs: Array<{ id: number }> }).docs[0]?.id
    if (!mediaId) throw new Error('Seed media first (pnpm seed:kct)')
    const category = await create('app-categories', {
      title: `Admin Legal Category ${suffix}`,
      slug: `admin-legal-category-${suffix}`,
    })
    await create('document-types', { title: TERMS_TITLE, slug: `admin-terms-${suffix}` })
    await create('document-types', {
      title: PRIVACY_TITLE,
      slug: `admin-privacy-${suffix}`,
      requiredForPlay: true,
    })
    const app = await create('apps', {
      name: `Admin Legal App ${suffix}`,
      slug: APP_SLUG,
      tagline: 'A tagline for the admin legal documents test app.',
      shortDescription: 'Short description',
      icon: mediaId,
      category: category.id,
      platforms: ['android'],
      status: 'live',
      _status: 'published',
    })
    appId = app.id
    await request.dispose()

    page = await (await browser.newContext()).newPage()
    await login({ page, user: testUser })
  })

  test.afterAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    // Deleting the app cascades to its documents.
    for (const { collection, id } of created) {
      await request.delete(`${BASE}/api/${collection}/${id}`, { headers: auth() })
    }
    await request.dispose()
    await cleanupTestUser()
  })

  const openLegalTab = async () => {
    await page.goto(`${BASE}/admin/collections/apps/${appId}`)
    await page.getByRole('button', { name: /^Legal/ }).click()
  }

  test('shows the Google Play required-document banner', async () => {
    await openLegalTab()
    await expect(page.getByText(`${PRIVACY_TITLE} is missing`)).toBeVisible()
  })

  test('adds a document from an uploaded .md file and publishes it', async () => {
    await openLegalTab()
    await page.getByRole('button', { name: 'Add new' }).click()
    const drawer = page.locator('.drawer--is-open').last()
    await expect(drawer.locator('#field-app')).toContainText(`Admin Legal App ${suffix}`)

    await drawer.locator('#field-documentType').click()
    await page.getByRole('option', { name: TERMS_TITLE }).click()

    await drawer
      .locator('input[type="file"][data-markdown-upload]')
      .setInputFiles(path.join(FIXTURES, 'bad.docx'))
    await expect(drawer.getByText('Only .md or .markdown files are allowed.')).toBeVisible()

    await drawer
      .locator('input[type="file"][data-markdown-upload]')
      .setInputFiles(path.join(FIXTURES, 'terms.en.md'))
    await expect(drawer.locator('#field-title')).toHaveValue('Terms of Service')
    await drawer.getByRole('button', { name: 'Preview', exact: true }).click()
    await expect(drawer.locator('[data-markdown-preview]')).toContainText('Acceptable use')

    await drawer.getByRole('button', { name: 'Publish changes' }).click()
    await expect(drawer.getByText('Status: Published')).toBeVisible()
    await expect(drawer.locator('[data-public-url]')).toContainText(`/apps/${APP_SLUG}/legal/`)
    await openLegalTab()
    await expect(page.locator('.relationship-table')).toContainText('Terms of Service')
    await expect(page.getByText(`${PRIVACY_TITLE} is missing`)).toBeVisible()
  })

  test('locks the app slug while published documents exist', async () => {
    await page.goto(`${BASE}/admin/collections/apps/${appId}`)
    await expect(page.locator('#field-slug')).not.toBeEditable()
    await page.getByRole('button', { name: 'Unlock slug' }).click()
    const modal = page.locator('.slug-lock-modal')
    await expect(modal).toContainText(`/apps/${APP_SLUG}/legal/`)
    await expect(modal).toContainText(`/id/apps/${APP_SLUG}/legal/`)
    const confirm = modal.getByRole('button', { name: 'Unlock' })
    await expect(confirm).toBeDisabled()
    await modal.getByRole('checkbox').check()
    await expect(confirm).toBeEnabled()
    await confirm.click()
    const slugInput = page.locator('#field-slug')
    await expect(slugInput).toBeEditable()

    // Two edits separated by an autosave (interval 375 ms): neither may be rejected by the guard.
    await slugInput.fill(`${APP_SLUG}-renamed`)
    await page.waitForTimeout(1_500)
    await slugInput.fill(`${APP_SLUG}-renamed-2`)
    await page.waitForTimeout(1_500)
    await expect(page.locator('[data-sonner-toast][data-type="error"], .field-error')).toHaveCount(
      0,
    )
    await expect(slugInput).toBeEditable()
    await expect
      .poll(async () => {
        const res = await page.request.get(
          `${BASE}/api/apps/${appId}?draft=true&depth=0&select[slug]=true`,
          { headers: auth() },
        )
        return ((await res.json()) as { slug: string }).slug
      })
      .toBe(`${APP_SLUG}-renamed-2`)
  })

  test('deletes a document and removes its row', async () => {
    await openLegalTab()
    await page.locator('.relationship-table .drawer-link__doc-drawer-toggler').first().click()
    const drawer = page.locator('.drawer--is-open').last()
    await expect(drawer.getByText(/Google Play Console/)).toBeVisible()
    await drawer.locator('.doc-controls__dots').click()
    await page.locator('#action-delete').last().click()
    await page.locator('.delete-document').getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByText(/deleted/i).first()).toBeVisible()
    await openLegalTab()
    await expect(page.locator('.relationship-table')).not.toContainText('Terms of Service')
  })
})
