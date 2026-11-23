import type { CollectionSlug, Payload, Where } from 'payload'

/** Dependency order: documents reference apps + types; types refuse deletion while used. */
const CLEANUP_ORDER = [
  'redirects',
  'app-documents',
  'apps',
  'document-types',
  'app-categories',
] as const satisfies readonly CollectionSlug[]

type CleanupCollection = (typeof CLEANUP_ORDER)[number]
export type CreatedIds = Partial<Record<CleanupCollection, number[]>>

/** Teardown can delete several documents through hooks; the default 10 s is too tight. */
export const CLEANUP_TIMEOUT = 60_000

const sweepWhere = (collection: CleanupCollection, suffix: string): Where => {
  const like = { like: suffix }
  if (collection === 'redirects') return { from: like }
  // Documents of a suite may have plain slugs (e.g. `doc-0`); match them through their app.
  if (collection === 'app-documents') return { or: [{ slug: like }, { 'app.slug': like }] }
  return { slug: like }
}

const isNotFound = (error: unknown) => (error as { status?: number })?.status === 404

/**
 * Deletes the tracked ids, then sweeps every row whose slug contains the suite's unique suffix
 * (catches rows created by a test that failed before its id was tracked). Failures are logged,
 * never thrown, so one bad row does not hide the rest of the teardown.
 */
export async function cleanupLegalData(
  payload: Payload,
  created: CreatedIds,
  suffix: string,
): Promise<void> {
  const context = { disableRevalidate: true }
  for (const collection of CLEANUP_ORDER) {
    for (const id of created[collection] ?? []) {
      try {
        await payload.delete({ collection, id, context })
      } catch (error) {
        // Already gone, e.g. documents cascaded with their app.
        if (isNotFound(error)) continue
        console.warn(`[cleanup] delete ${collection}#${id} failed:`, (error as Error).message)
      }
    }
    try {
      const { errors } = await payload.delete({
        collection,
        where: sweepWhere(collection, suffix),
        context,
      })
      for (const { id, message } of errors) {
        console.warn(`[cleanup] sweep ${collection}#${id} (${suffix}) failed: ${message}`)
      }
    } catch (error) {
      console.warn(`[cleanup] sweep ${collection} (${suffix}) failed:`, (error as Error).message)
    }
  }
}
