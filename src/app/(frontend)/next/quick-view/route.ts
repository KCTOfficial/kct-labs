import configPromise from '@payload-config'
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'

import { getDictionary, isLocale } from '@/i18n'
import { isValidSlug } from '@/utilities/apps/appPath'
import { getAppBySlug } from '@/utilities/apps/queries'
import { toQuickView } from '@/utilities/apps/quickView'

/**
 * `GET /next/quick-view?slug=<slug>&locale=<en|id>` — slim, read-only JSON for the app quick-view
 * popup. Data comes from the same cached, access-controlled query as the detail page
 * (`getAppBySlug`, published documents only), so a CMS edit invalidates both through the same tag.
 *
 * - Lives under `/next/` on purpose: excluded from the locale proxy and disallowed in robots.txt.
 * - Archived/unpublished/unknown apps answer 404 → the client falls back to normal navigation.
 * - Errors never leak internals; details go to the server log only.
 */
const NO_STORE = 'no-store'
// Short private cache: repeat opens are instant without serving stale data for long.
const PRIVATE_SHORT = 'private, max-age=30'

const respond = (body: unknown, status: number, cacheControl: string): Response =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': cacheControl, 'X-Robots-Tag': 'noindex' },
  })

export async function GET(req: NextRequest): Promise<Response> {
  const slug = req.nextUrl.searchParams.get('slug')
  const locale = req.nextUrl.searchParams.get('locale')

  if (!isValidSlug(slug) || !isLocale(locale)) {
    return respond({ error: 'invalid_request' }, 400, NO_STORE)
  }

  try {
    const app = await getAppBySlug(slug, locale)
    const view = app ? toQuickView(app, getDictionary(locale)) : null
    if (!view) return respond({ error: 'not_found' }, 404, NO_STORE)
    return respond(view, 200, PRIVATE_SHORT)
  } catch (error) {
    const payload = await getPayload({ config: configPromise })
    payload.logger.error({ err: error, slug }, '[quick-view] failed to load app')
    return respond({ error: 'unavailable' }, 500, NO_STORE)
  }
}
