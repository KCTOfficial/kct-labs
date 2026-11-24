import Script from 'next/script'
import React from 'react'

import {
  buildGaInitScript,
  buildGaScriptSrc,
  resolveGaMeasurementId,
} from '@/utilities/analytics/googleAnalytics'

type Props = {
  /** Draft/preview mode — never count editors as visitors. */
  isPreview: boolean
}

/**
 * GA4 loader. Server component: the Measurement ID is read at BUILD time (pages are static), so a
 * change needs a redeploy (`FORCE_BUILD=1 ./deploy/deploy.sh`), like `QUICK_VIEW_ENABLED`.
 * Renders nothing (zero bytes, zero requests) outside production, in preview, on staging
 * (`DISALLOW_INDEXING=true`) or when the ID is missing/malformed.
 *
 * `lazyOnload` keeps gtag.js off the LCP/TBT critical path (Lighthouse mobile ≥ 90 requirement);
 * the trade-off is that visits shorter than the first idle period may go uncounted.
 * SPA navigations and the quick-view popup (pushState) are recorded by GA4 enhanced measurement.
 */
export function GoogleAnalytics({ isPreview }: Props) {
  const measurementId = resolveGaMeasurementId({
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    nodeEnv: process.env.NODE_ENV,
    isPreview,
    disallowIndexing: process.env.DISALLOW_INDEXING === 'true',
  })
  if (!measurementId) return null

  return (
    <>
      <Script id="ga-init" strategy="lazyOnload">
        {buildGaInitScript(measurementId)}
      </Script>
      <Script id="ga-gtag" src={buildGaScriptSrc(measurementId)} strategy="lazyOnload" />
    </>
  )
}
