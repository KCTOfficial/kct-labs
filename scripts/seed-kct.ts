/**
 * Idempotent KCT Hub content seed. Usage: `pnpm seed:kct`
 * Safe to re-run: upserts by slug, never deletes, keeps existing Header/Footer edits.
 * `SEED_KCT_REPLACE_HEADER=true pnpm seed:kct` explicitly replaces the header navigation with the design one.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import config from '@payload-config'
import { getPayload } from 'payload'

import { seedKct } from '../src/endpoints/seed/kct'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const payload = await getPayload({ config })
try {
  await seedKct(payload, path.resolve(dirname, '../design/images/apps'), {
    replaceHeader: process.env.SEED_KCT_REPLACE_HEADER === 'true',
  })
  payload.logger.info('[seed:kct] done')
} catch (error) {
  payload.logger.error({ err: error }, '[seed:kct] failed')
  process.exitCode = 1
} finally {
  await payload.destroy()
}
