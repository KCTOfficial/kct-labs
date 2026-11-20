import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

import type { Locale } from '@/i18n/config'
import type { Footer, Header } from '@/payload-types'
import { PLAY_STORE_DEVELOPER_URL } from '@/utilities/seo/constants'

import {
  contact,
  footerColumns,
  footerTagline,
  homeContent,
  navItems,
  seedApps,
  seedCategories,
  type Localized,
} from './content'

const LOCALES: Locale[] = ['en', 'id']
const SCREENSHOTS_PER_APP = 3

/** Minimal Lexical document with one paragraph (rich text `description`). */
const paragraph = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        textFormat: 0,
        textStyle: '',
        children: [
          { type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
        ],
      },
    ],
  },
})

const pick = <T>(value: Localized<T>, locale: Locale): T => value[locale]

/** Re-uses existing rows' ids so localized sub-fields of non-localized arrays are merged, not replaced. */
const withIds = <T extends object>(rows: T[], existing?: Array<{ id?: string | null }> | null) =>
  rows.map((row, i) => ({ ...row, id: existing?.[i]?.id ?? undefined }))

/**
 * Upload a local image once (matched by filename). Returns the media id.
 * Files live in `design/images` — replace them with HD versions and re-run to refresh new uploads.
 */
const ensureMedia = async (payload: Payload, filePath: string, alt: string): Promise<number> => {
  const filename = path.basename(filePath)
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    pagination: false,
    where: { filename: { equals: filename } },
  })
  if (existing.docs[0]) return existing.docs[0].id

  const created = await payload.create({ collection: 'media', data: { alt }, filePath })
  return created.id
}

/**
 * Idempotent, non-destructive seed for KCT Hub content (EN + ID).
 * - Upserts app categories and apps by slug; never deletes documents.
 * - Fills Home every run; fills Header/Footer only when they are still empty (never overwrites edits).
 */
export const seedKct = async (
  payload: Payload,
  imagesDir: string,
  options: { replaceHeader?: boolean } = {},
): Promise<void> => {
  const log = (msg: string) => payload.logger.info(`[seed:kct] ${msg}`)
  const context = { disableRevalidate: true }

  // 1. Categories
  const categoryIds = new Map<string, number>()
  for (const cat of seedCategories) {
    const found = await payload.find({
      collection: 'app-categories',
      depth: 0,
      limit: 1,
      where: { slug: { equals: cat.slug } },
    })
    let id = found.docs[0]?.id
    for (const locale of LOCALES) {
      const data = { title: pick(cat.title, locale), slug: cat.slug, sortOrder: cat.sortOrder }
      if (id) await payload.update({ collection: 'app-categories', id, data, locale, context })
      else id = (await payload.create({ collection: 'app-categories', data, locale, context })).id
    }
    categoryIds.set(cat.slug, id!)
  }
  log(`categories: ${categoryIds.size}`)

  // 2. Apps
  const appIds = new Map<string, number>()
  for (const app of seedApps) {
    const iconPath = path.join(imagesDir, `${app.packageId}-icon.png`)
    if (!fs.existsSync(iconPath)) throw new Error(`Missing icon: ${iconPath}`)
    const icon = await ensureMedia(payload, iconPath, `${app.name} app icon`)

    const screenshots: number[] = []
    for (let i = 1; i <= SCREENSHOTS_PER_APP; i++) {
      const shot = path.join(imagesDir, `${app.packageId}-shot${i}.png`)
      if (fs.existsSync(shot))
        screenshots.push(await ensureMedia(payload, shot, `${app.name} screenshot ${i}`))
    }

    const found = await payload.find({
      collection: 'apps',
      depth: 0,
      draft: true,
      limit: 1,
      where: { slug: { equals: app.slug } },
    })
    let id = found.docs[0]?.id
    let featureRows = found.docs[0]?.features ?? null

    for (const locale of LOCALES) {
      const data = {
        name: app.name,
        slug: app.slug,
        generateSlug: false,
        tagline: pick(app.tagline, locale),
        shortDescription: pick(app.shortDescription, locale),
        description: paragraph(pick(app.description, locale)),
        features: withIds(
          pick(app.features, locale).map((label) => ({ label })),
          featureRows,
        ),
        icon,
        screenshots,
        category: categoryIds.get(app.category)!,
        status: 'live' as const,
        platforms: ['android' as const],
        downloadsLabel: app.downloadsLabel ?? '',
        ageRating: app.ageRating ?? '',
        playStoreUrl: `https://play.google.com/store/apps/details?id=${app.packageId}`,
        packageId: app.packageId,
        featured: Boolean(app.featured),
        sortOrder: app.sortOrder,
        publishedAt: new Date().toISOString(),
        _status: 'published' as const,
      }
      const doc = id
        ? await payload.update({ collection: 'apps', id, data, locale, context })
        : await payload.create({ collection: 'apps', data, locale, context })
      id = doc.id
      featureRows = doc.features ?? null
    }
    appIds.set(app.slug, id!)
  }
  log(`apps: ${appIds.size}`)

  // 3. Home global
  const current = await payload.findGlobal({ slug: 'home', depth: 0, locale: 'en' })
  let featureRows = current.featured?.features ?? null
  let stepRows = current.process?.steps ?? null
  let serviceRows = current.about?.services ?? null
  const h = homeContent
  const iconRows = (
    items: typeof h.featured.features,
    locale: Locale,
    existing: typeof featureRows,
  ) =>
    withIds(
      items.map((it) => ({
        icon: it.icon as never,
        title: pick(it.title, locale),
        description: pick(it.description, locale),
      })),
      existing,
    )

  for (const locale of LOCALES) {
    const updated = await payload.updateGlobal({
      slug: 'home',
      locale,
      context,
      data: {
        hero: {
          badge: pick(h.hero.badge, locale),
          headline: pick(h.hero.headline, locale),
          subheadline: pick(h.hero.subheadline, locale),
          primaryCtaLabel: pick(h.hero.primaryCtaLabel, locale),
          primaryCtaUrl: '/apps',
          secondaryCtaLabel: pick(h.hero.secondaryCtaLabel, locale),
          secondaryCtaUrl: PLAY_STORE_DEVELOPER_URL,
          showcaseApps: h.hero.showcase.map((s) => appIds.get(s)!).filter(Boolean),
        },
        catalog: {
          eyebrow: pick(h.catalog.eyebrow, locale),
          title: pick(h.catalog.title, locale),
          subtitle: pick(h.catalog.subtitle, locale),
          limit: 7,
          showServiceCard: true,
          serviceCard: {
            badge: pick(h.catalog.serviceCard.badge, locale),
            title: pick(h.catalog.serviceCard.title, locale),
            body: pick(h.catalog.serviceCard.body, locale),
            ctaLabel: pick(h.catalog.serviceCard.ctaLabel, locale),
            ctaUrl: '/#contact',
          },
        },
        featured: {
          enabled: true,
          eyebrow: pick(h.featured.eyebrow, locale),
          title: pick(h.featured.title, locale),
          description: pick(h.featured.description, locale),
          app: appIds.get('koorva-work'),
          secondaryApp: appIds.get('koorva-task'),
          visualLabel: pick(h.featured.visualLabel, locale),
          features: iconRows(h.featured.features, locale, featureRows),
          ctaLabel: pick(h.featured.ctaLabel, locale),
        },
        process: {
          enabled: true,
          eyebrow: pick(h.process.eyebrow, locale),
          title: pick(h.process.title, locale),
          subtitle: pick(h.process.subtitle, locale),
          steps: iconRows(h.process.steps, locale, stepRows),
        },
        about: {
          enabled: true,
          eyebrow: pick(h.about.eyebrow, locale),
          title: pick(h.about.title, locale),
          body: pick(h.about.body, locale),
          linkLabel: pick(h.about.linkLabel, locale),
          linkUrl: 'https://www.kct.co.id',
          services: iconRows(h.about.services, locale, serviceRows),
        },
        cta: {
          enabled: true,
          kicker: pick(h.cta.kicker, locale),
          title: pick(h.cta.title, locale),
          body: pick(h.cta.body, locale),
          whatsappLabel: pick(h.cta.whatsappLabel, locale),
          whatsappNumber: contact.whatsapp,
          email: contact.email,
        },
        meta: {
          title: pick(h.meta.title, locale),
          description: pick(h.meta.description, locale),
        },
      },
    })
    featureRows = updated.featured?.features ?? null
    stepRows = updated.process?.steps ?? null
    serviceRows = updated.about?.services ?? null
  }
  log('home: updated (en, id)')

  // 4. Header (only when empty, or when explicitly requested with `replaceHeader`)
  const header = await payload.findGlobal({ slug: 'header', depth: 0 })
  if (!header.navItems?.length || options.replaceHeader) {
    let rows: Array<{ id?: string | null }> | null = null
    for (const locale of LOCALES) {
      const updated: Header = await payload.updateGlobal({
        slug: 'header',
        locale,
        context,
        data: {
          navItems: withIds(
            navItems.map((item) => ({
              link: { type: 'custom' as const, url: item.url, label: item.label.en, newTab: false },
              localizedLabel: pick(item.label, locale),
            })),
            rows,
          ),
          cta: { label: locale === 'en' ? 'Contact Us' : 'Hubungi Kami', url: '/#contact' },
        },
      })
      rows = updated.navItems ?? null
    }
    log('header: seeded')
  } else log('header: kept existing navigation')

  // 5. Footer (only when no columns yet)
  const footer = await payload.findGlobal({ slug: 'footer', depth: 0 })
  if (!footer.columns?.length) {
    let columns: Footer['columns'] = null
    for (const locale of LOCALES) {
      const updated: Footer = await payload.updateGlobal({
        slug: 'footer',
        locale,
        context,
        data: {
          tagline: pick(footerTagline, locale),
          columns: footerColumns.map((col, ci) => ({
            id: columns?.[ci]?.id ?? undefined,
            title: pick(col.title, locale),
            links: withIds(
              col.links.map((l) => ({
                link: {
                  type: 'custom' as const,
                  url: l.url,
                  label: l.label.en,
                  newTab: /^https?:/.test(l.url),
                },
                localizedLabel: pick(l.label, locale),
              })),
              columns?.[ci]?.links,
            ),
          })),
          contact: {
            email: contact.email,
            whatsapp: contact.whatsapp,
            phone: contact.phone,
            address: pick(contact.address, locale),
          },
          copyrightHolder: 'PT Kreasindo Cipta Teknologi',
        },
      })
      columns = updated.columns ?? null
    }
    log('footer: seeded')
  } else log('footer: kept existing columns')
}
