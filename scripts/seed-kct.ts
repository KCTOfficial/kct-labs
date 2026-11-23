/**
 * Idempotent KCT Hub content seed. Usage: `pnpm seed:kct`
 * Safe to re-run: upserts by slug, never deletes, keeps existing Header/Footer edits.
 * `SEED_KCT_REPLACE_HEADER=true pnpm seed:kct` explicitly replaces the header navigation with the design one.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { seedKct } from '../src/endpoints/seed/kct'
import type { DocumentType } from '../src/payload-types'

type DocumentTypeSeed = Pick<DocumentType, 'icon' | 'requiredForPlay' | 'slug' | 'sortOrder'> & {
  title: { en: string; id: string }
}

const DOCUMENT_TYPES: DocumentTypeSeed[] = [
  {
    slug: 'privacy-policy',
    icon: 'shield-check',
    requiredForPlay: true,
    sortOrder: 1,
    title: { en: 'Privacy Policy', id: 'Kebijakan Privasi' },
  },
  {
    slug: 'terms-of-service',
    icon: 'scroll-text',
    requiredForPlay: false,
    sortOrder: 2,
    title: { en: 'Terms of Service', id: 'Ketentuan Layanan' },
  },
  {
    slug: 'terms-and-conditions',
    icon: 'file-check',
    requiredForPlay: false,
    sortOrder: 3,
    title: { en: 'Terms & Conditions', id: 'Syarat & Ketentuan' },
  },
  {
    slug: 'account-deletion',
    icon: 'user-x',
    requiredForPlay: false,
    sortOrder: 4,
    title: { en: 'Account Deletion', id: 'Hapus Akun' },
  },
]

/** Upserts legal document types by slug (slug is immutable, so it is never sent on update). */
async function seedDocumentTypes(payload: Payload): Promise<void> {
  for (const { title, slug, ...rest } of DOCUMENT_TYPES) {
    const existing = await payload.find({
      collection: 'document-types',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      pagination: false,
    })
    const current = existing.docs[0]
    const doc = current
      ? await payload.update({
          collection: 'document-types',
          id: current.id,
          data: { ...rest, title: title.en },
          locale: 'en',
        })
      : await payload.create({
          collection: 'document-types',
          data: { ...rest, slug, title: title.en },
          locale: 'en',
        })
    await payload.update({
      collection: 'document-types',
      id: doc.id,
      data: { title: title.id },
      locale: 'id',
    })
    payload.logger.info(`[seed:kct] document type ${slug} ${current ? 'updated' : 'created'}`)
  }
}

const dirname = path.dirname(fileURLToPath(import.meta.url))

const payload = await getPayload({ config })
try {
  await seedKct(payload, path.resolve(dirname, '../design/images/apps'), {
    replaceHeader: process.env.SEED_KCT_REPLACE_HEADER === 'true',
  })
  await seedDocumentTypes(payload)
  payload.logger.info('[seed:kct] done')
} catch (error) {
  payload.logger.error({ err: error }, '[seed:kct] failed')
  process.exitCode = 1
} finally {
  await payload.destroy()
}
