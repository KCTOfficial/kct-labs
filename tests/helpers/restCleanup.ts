import type { APIRequestContext } from '@playwright/test'

/** Dependency order: documents reference apps + types; types refuse deletion while used. */
const CLEANUP_ORDER = ['app-documents', 'apps', 'document-types', 'app-categories'] as const

export const CLEANUP_TIMEOUT = 60_000

/**
 * REST teardown for e2e suites: deletes the tracked rows in dependency order, then sweeps every
 * row whose slug contains the suite's unique suffix. Failures are logged, never thrown.
 */
export async function cleanupLegalDataRest(
  request: APIRequestContext,
  baseUrl: string,
  token: string,
  created: Array<{ collection: string; id: number }>,
  suffix: string,
): Promise<void> {
  const headers = { Authorization: `JWT ${token}` }
  const rank = (collection: string) => {
    const index = CLEANUP_ORDER.indexOf(collection as (typeof CLEANUP_ORDER)[number])
    return index === -1 ? CLEANUP_ORDER.length : index
  }
  for (const { collection, id } of [...created].sort(
    (a, b) => rank(a.collection) - rank(b.collection),
  )) {
    const res = await request.delete(`${baseUrl}/api/${collection}/${id}`, { headers })
    // 404: already removed, e.g. documents cascaded with their app.
    if (!res.ok() && res.status() !== 404) {
      console.warn(
        `[cleanup] delete ${collection}#${id} failed: ${res.status()} ${await res.text()}`,
      )
    }
  }
  const like = encodeURIComponent(suffix)
  for (const collection of CLEANUP_ORDER) {
    const where =
      collection === 'app-documents'
        ? `where[or][0][slug][like]=${like}&where[or][1][app.slug][like]=${like}`
        : `where[slug][like]=${like}`
    const res = await request.delete(`${baseUrl}/api/${collection}?${where}&draft=true`, {
      headers,
    })
    if (!res.ok()) {
      console.warn(
        `[cleanup] sweep ${collection} (${suffix}) failed: ${res.status()} ${await res.text()}`,
      )
      continue
    }
    const { errors = [] } = (await res.json()) as {
      errors?: Array<{ id: number; message: string }>
    }
    for (const { id, message } of errors) {
      console.warn(`[cleanup] sweep ${collection}#${id} (${suffix}) failed: ${message}`)
    }
  }
}
