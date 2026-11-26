import { expect, test, type Page } from '@playwright/test'

import {
  BASE,
  CLEANUP_TIMEOUT,
  createApp,
  setupE2e,
  teardownE2e,
  type E2eContext,
} from '../helpers/e2eApps'

/**
 * App detail page: the optional CMS sections (strip, How it works, key features, data banner), the
 * accent colour, the hero phones, and that an app without any of them renders as it always did.
 * Creates its own uniquely-named apps over REST and removes them afterwards.
 */
const suffix = `e2ed-${Date.now().toString(36)}`

test.describe('App detail page', () => {
  test.describe.configure({ mode: 'serial' })

  let ctx: E2eContext
  let full: { id: number; slug: string }
  let plain: { id: number; slug: string }

  test.beforeAll(async ({ playwright }) => {
    test.setTimeout(240_000)
    ctx = await setupE2e(playwright, suffix)
    const m = ctx.mediaId
    full = await createApp(ctx, 'Full App', {
      accentColor: 'green',
      screenshots: [m, m, m],
      supportEmail: 'support@example.com',
      highlights: [
        { icon: 'zap', title: 'Siap offline', description: 'Tanpa internet' },
        { icon: 'camera', title: 'Pindai struk' },
      ],
      howItWorks: {
        title: 'Langkah sederhana',
        description: 'Mulai dalam beberapa ketukan.',
        steps: [
          { title: 'Catat', description: 'Tambah transaksi.', image: m },
          { title: 'Pantau' },
        ],
      },
      featuresIntro: {
        title: 'Semua yang Anda butuhkan',
        description: 'Dari catatan sampai laporan.',
      },
      features: [
        { label: 'Anggaran', icon: 'wallet', description: 'Atur anggaran bulanan' },
        { label: 'Fitur lama tanpa ikon' },
      ],
      dataControl: {
        title: 'Data Anda, kendali Anda',
        description: 'Tersimpan di perangkat Anda.',
      },
    })
    plain = await createApp(ctx, 'Plain App', { features: [{ label: 'Plain feature' }] })

    // English texts for the full app: rows are matched by their ids.
    const doc = (await (
      await ctx.request.get(`${BASE}/api/apps/${full.id}?depth=0&locale=id`, {
        headers: { Authorization: `JWT ${ctx.token}` },
      })
    ).json()) as {
      highlights: Array<{ id: string }>
      features: Array<{ id: string }>
      howItWorks: { steps: Array<{ id: string }> }
    }
    const res = await ctx.request.patch(`${BASE}/api/apps/${full.id}?locale=en`, {
      headers: { Authorization: `JWT ${ctx.token}` },
      data: {
        tagline: 'English tagline',
        shortDescription: 'English short description',
        highlights: [
          { id: doc.highlights[0]!.id, title: 'Offline ready' },
          { id: doc.highlights[1]!.id, title: 'Receipt scan' },
        ],
        howItWorks: {
          title: 'Simple steps',
          steps: [
            { id: doc.howItWorks.steps[0]!.id, title: 'Record' },
            { id: doc.howItWorks.steps[1]!.id, title: 'Track' },
          ],
        },
        features: [
          { id: doc.features[0]!.id, label: 'Budget' },
          { id: doc.features[1]!.id, label: 'Legacy feature without icon' },
        ],
      },
    })
    expect(res.ok(), await res.text()).toBe(true)
  })

  test.afterAll(async ({ playwright }) => {
    test.setTimeout(CLEANUP_TIMEOUT)
    await teardownE2e(playwright, ctx)
  })

  const sectionOrder = (page: Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('article [data-section]')].map((el) =>
        el.getAttribute('data-section'),
      ),
    )

  const headTags = (page: Page) =>
    page.evaluate(() => ({
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
      hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) =>
        l.getAttribute('hreflang'),
      ),
      h1: document.querySelectorAll('h1').length,
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) =>
        ([] as Array<{ '@type': string }>)
          .concat(JSON.parse(s.textContent || '[]'))
          .map((o) => o['@type']),
      ),
    }))

  test('app with every section: order, accent, phones, one h1 and SEO tags', async ({ page }) => {
    const res = await page.goto(`${BASE}/apps/${full.slug}`)
    expect(res?.status()).toBe(200)
    expect(await sectionOrder(page)).toEqual([
      'highlights',
      'how-it-works',
      'features',
      'data-control',
      'related',
    ])
    await expect(page.locator('article')).toHaveAttribute('data-accent', 'green')

    const tags = await headTags(page)
    expect(tags.h1).toBe(1)
    expect(tags.canonical).toMatch(new RegExp(`/apps/${full.slug}$`))
    expect(tags.hreflang).toEqual(expect.arrayContaining(['id', 'en', 'x-default']))
    expect(tags.jsonLd).toEqual(expect.arrayContaining(['MobileApplication', 'BreadcrumbList']))

    // Three phones (screenshots 2, 1, 3), decorative. The old look is gone: no gallery, spec row,
    // share button, About text or information panel (design/app-detail.png has none of them).
    await expect(page.locator('[data-hero-phones] img')).toHaveCount(3)
    await expect(page.locator('[data-hero-phones] img[alt=""]')).toHaveCount(3)
    await expect(page.locator('#gallery-title')).toHaveCount(0)
    await expect(page.locator('article dl')).toHaveCount(0)
    await expect(page.locator('article aside')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: 'Tentang aplikasi' })).toHaveCount(0)
    await expect(page.locator('[data-hero-chip]')).toContainText(/Aplikasi E2E Category/i)

    // Content from the CMS, the default key features heading replaced, legacy feature kept with a check.
    await expect(page.locator('[data-section="highlights"]')).toContainText('Siap offline')
    await expect(page.locator('h2#features')).toHaveText('Semua yang Anda butuhkan')
    await expect(page.locator('[data-section="features"] [data-icon="wallet"]')).toHaveCount(1)
    await expect(page.locator('[data-section="features"] [data-icon="check"]')).toHaveCount(1)
    await expect(page.locator('[data-section="how-it-works"] ol > li')).toHaveCount(2)
    // No legal documents: the banner has no link.
    await expect(page.locator('[data-section="data-control"] a')).toHaveCount(0)
    // The support email stays reachable in the quiet legal row.
    await expect(page.locator('a[href="mailto:support@example.com"]')).toHaveCount(1)
  })

  test('"explore all features" scrolls to the key features', async ({ page }) => {
    await page.goto(`${BASE}/apps/${full.slug}`)
    await page.locator('[data-section="how-it-works"] a[href="#features"]').click()
    await expect(page).toHaveURL(/#features$/)
    await expect(page.locator('h2#features')).toBeInViewport()
  })

  test('related rows: one named link each, marked for the quick view, and it navigates normally', async ({
    page,
  }) => {
    await page.goto(`${BASE}/apps/${full.slug}`)
    const rows = page.locator('[data-section="related"] ul > li')
    expect(await rows.count()).toBeGreaterThan(0)
    const link = page.locator('[data-section="related"] a[data-quick-view]').first()
    await expect(link).toHaveAttribute('href', /^\/apps\/[a-z0-9-]+$/)
    const href = (await link.getAttribute('href'))!
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.locator('dialog.qv-dialog[open]')).toHaveCount(0) // detail pages never stack a popup
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('an app without any new content keeps its page: no extra sections, same text', async ({
    page,
  }) => {
    const res = await page.goto(`${BASE}/apps/${plain.slug}`)
    expect(res?.status()).toBe(200)
    // Only the legacy feature list (now cards) and the related apps: nothing empty is rendered.
    expect(await sectionOrder(page)).toEqual(['features', 'related'])
    await expect(page.locator('article')).not.toHaveAttribute('data-accent', /.+/)
    await expect(page.locator('[data-hero-phones]')).toHaveCount(0) // no screenshots → no phones
    await expect(page.locator('h2#features')).toHaveText('Fitur utama') // default heading (ID)
    await expect(page.locator('[data-section="features"]')).toContainText('Plain feature')
    await expect(page.locator('[data-section="features"] [data-icon="check"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 2, name: 'Tentang aplikasi' })).toHaveCount(0)
    expect((await headTags(page)).h1).toBe(1)
  })

  test('English page shows English section text, the default locale shows Indonesian', async ({
    page,
  }) => {
    await page.goto(`${BASE}/en/apps/${full.slug}`)
    await expect(page.locator('[data-section="highlights"]')).toContainText('Offline ready')
    await expect(page.locator('[data-section="how-it-works"] h2')).toHaveText('Simple steps')
    await expect(page.locator('[data-section="features"]')).toContainText('Budget')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.goto(`${BASE}/apps/${full.slug}`)
    await expect(page.locator('[data-section="highlights"]')).toContainText('Siap offline')
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  })

  test('layout shift stays at most 0.1 on the full app page (1440×900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/apps/${full.slug}`)
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

  for (const width of [1024, 1280, 1440, 1920, 2560]) {
    test(`hero motif stays clear of the hero text at ${width}px (its strong rings are exempt from the text-contrast limit)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${BASE}/apps/${full.slug}`)
      const { motifLeft, textRight } = await page.evaluate(() => {
        const header = document.querySelector('article header')!
        const box = header.getBoundingClientRect()
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
        // Outer edge of the thick ring in globals.css: circle at 82% of the header, radius 27rem.
        const motifLeft = box.left + box.width * 0.82 - 27 * rem
        const text = [
          ...header.querySelectorAll('nav, [data-hero-chip], h1, h1 + p, a[href*="play.google"]'),
        ]
        return {
          motifLeft,
          textRight: Math.max(...text.map((el) => el.getBoundingClientRect().right)),
        }
      })
      expect(textRight).toBeLessThan(motifLeft)
    })
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1440 },
  ]) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`no horizontal scroll at ${viewport.width}×${viewport.height} (${colorScheme})`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport)
        await page.emulateMedia({ colorScheme })
        for (const slug of [full.slug, plain.slug]) {
          await page.goto(`${BASE}/apps/${slug}`)
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
            slug,
          ).toBeLessThanOrEqual(0)
          await expect(page.locator('h1')).toHaveCount(1)
          // Phones only show on desktop (never on phones/tablets); an app without screenshots has none.
          const shown = await page
            .locator('[data-hero-phones]')
            .evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().width > 0).length)
          expect(shown, `${slug} phones`).toBe(slug === full.slug && viewport.width >= 1024 ? 1 : 0)
        }
      })
    }
  }
})
