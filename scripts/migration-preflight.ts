/**
 * Non-interactive migration preflight (run in the migrator container before `payload migrate`).
 *
 * `payload migrate` waits forever on a y/N prompt when the database still contains the dev-mode
 * push marker (`payload_migrations.batch = -1`, e.g. after restoring a dev backup). In a deploy
 * pipeline there is nobody to answer, so this script detects the marker up front.
 *
 * It also catches a database whose migration history claims the baseline was applied while the
 * KCT tables are missing (e.g. the post-restore SQL was run on a DB that was never restored):
 * `payload migrate` would then do nothing and `next build` would fail much later.
 *
 * Exit codes: 0 = safe to migrate, 3 = dev-push marker present (see docs/DEPLOYMENT.md C.4),
 *             4 = migrations recorded but schema missing (see docs/DEPLOYMENT.md G),
 *             1 = unexpected error (DB unreachable, etc.).
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const DEV_MARKER_EXIT = 3
const SCHEMA_MISMATCH_EXIT = 4

const errorText = (error: unknown): string =>
  error instanceof Error ? `${error.message} ${String(error.cause ?? '')}` : String(error)

const isMissingRelation = (error: unknown, table: string): boolean =>
  new RegExp(`relation "${table}" does not exist`, 'i').test(errorText(error))

let exitCode = 0
const payload = await getPayload({ config })
try {
  const markers = await payload.find({
    collection: 'payload-migrations',
    depth: 0,
    limit: 1,
    pagination: false,
    where: { batch: { equals: -1 } },
  })
  if (markers.docs.length > 0) {
    payload.logger.error(
      '[migration-preflight] dev-push marker found (payload_migrations.batch = -1)',
    )
    exitCode = DEV_MARKER_EXIT
  } else {
    const { totalDocs: appliedMigrations } = await payload.count({
      collection: 'payload-migrations',
      where: { batch: { greater_than: 0 } },
    })
    if (appliedMigrations > 0) {
      try {
        // Cheapest probe of a table created by the baseline migration.
        await payload.count({ collection: 'apps', overrideAccess: true })
      } catch (error) {
        if (!isMissingRelation(error, 'apps')) throw error
        payload.logger.error(
          '[migration-preflight] migrations are recorded but table "apps" is missing (schema mismatch)',
        )
        exitCode = SCHEMA_MISMATCH_EXIT
      }
    }
    if (exitCode === 0) payload.logger.info('[migration-preflight] OK')
  }
} catch (error) {
  // A brand-new empty database has no payload_migrations table yet → safe to migrate.
  // Drizzle wraps the Postgres error: the "relation … does not exist" text is in `cause`.
  if (isMissingRelation(error, 'payload_migrations')) {
    payload.logger.info('[migration-preflight] empty database, OK')
  } else {
    payload.logger.error({ err: error }, '[migration-preflight] failed')
    exitCode = 1
  }
} finally {
  await payload.destroy()
}
// Explicit exit: `payload run` does not propagate `process.exitCode`.
process.exit(exitCode)
