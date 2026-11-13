import { NextResponse, type NextRequest } from 'next/server'

import { resolveLocaleRoute } from '@/i18n/routing'

export function proxy(request: NextRequest) {
  const decision = resolveLocaleRoute(request.nextUrl.pathname)

  if (decision.type === 'next') return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = decision.pathname

  if (decision.type === 'redirect') return NextResponse.redirect(url, 308)

  return NextResponse.rewrite(url)
}

export const config = {
  /*
   * Run only on frontend page routes. Excluded:
   * - `api`, `admin`: Payload REST/GraphQL + admin panel
   * - `next/`: preview, exit-preview and seed route handlers
   * - `_next`: Next.js internals
   * - anything containing a dot: static files, `robots.txt`, `*-sitemap.xml` route handlers, media
   */
  matcher: ['/((?!api/|api$|admin/|admin$|next/|_next/|.*\\..*).*)'],
}
