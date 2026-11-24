/**
 * Google Analytics 4 (gtag.js) — pure helpers, no I/O, so every gating rule is unit-testable.
 * The React wrapper lives in `src/components/analytics/GoogleAnalytics.tsx`.
 */

/** GA4 web-stream Measurement ID, e.g. `G-ABC123DEF4`. NOT the numeric "Stream ID". */
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,14}$/

/**
 * Consent Mode v2 regions where `analytics_storage` starts as `denied` (EEA + UK + Switzerland).
 * The site has no consent banner yet, so for these visitors GA only receives cookieless pings
 * (no cookies, no user-level identifiers). Everywhere else collection is on by default.
 * When a banner is added, call `gtag('consent', 'update', { analytics_storage: 'granted' })`.
 */
export const CONSENT_DENIED_REGIONS = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IS',
  'IE',
  'IT',
  'LV',
  'LI',
  'LT',
  'LU',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'GB',
  'CH',
] as const

export type GaGateInput = {
  /** Raw `NEXT_PUBLIC_GA_MEASUREMENT_ID` (may be undefined, empty or padded). */
  measurementId: string | undefined
  /** `process.env.NODE_ENV` — analytics only ever runs in a production build. */
  nodeEnv: string | undefined
  /** Payload draft/preview mode: editors previewing content must not count as visitors. */
  isPreview: boolean
  /** `DISALLOW_INDEXING === 'true'` marks staging: keep its traffic out of the production property. */
  disallowIndexing: boolean
}

/** Trims and validates the ID. Anything malformed returns null (fail closed, never injected into a script). */
export function parseMeasurementId(raw: string | undefined): string | null {
  const value = raw?.trim().toUpperCase()
  return value && MEASUREMENT_ID_PATTERN.test(value) ? value : null
}

/** Returns the validated ID when GA must load for this request, otherwise null. */
export function resolveGaMeasurementId(input: GaGateInput): string | null {
  if (input.nodeEnv !== 'production') return null
  if (input.isPreview || input.disallowIndexing) return null
  return parseMeasurementId(input.measurementId)
}

/**
 * Inline bootstrap: dataLayer + gtag stub, Consent Mode v2 defaults, then config.
 * The ID is regex-validated and JSON-encoded, so no untrusted text reaches the script.
 * Ads signals stay off: the site runs no ads, so Google Signals / ad personalization add
 * data collection without any benefit.
 */
export function buildGaInitScript(measurementId: string): string {
  const id = parseMeasurementId(measurementId)
  if (!id) throw new Error('Invalid GA measurement ID')

  const adsDenied = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  }
  // The region-specific default takes precedence over the global one for matching visitors.
  const regional = { ...adsDenied, analytics_storage: 'denied', region: CONSENT_DENIED_REGIONS }
  const global = { ...adsDenied, analytics_storage: 'granted' }
  const config = { allow_google_signals: false, allow_ad_personalization_signals: false }

  return [
    'window.dataLayer=window.dataLayer||[];',
    'function gtag(){dataLayer.push(arguments);}',
    `gtag('consent','default',${JSON.stringify(regional)});`,
    `gtag('consent','default',${JSON.stringify(global)});`,
    "gtag('js',new Date());",
    `gtag('config',${JSON.stringify(id)},${JSON.stringify(config)});`,
  ].join('\n')
}

export function buildGaScriptSrc(measurementId: string): string {
  const id = parseMeasurementId(measurementId)
  if (!id) throw new Error('Invalid GA measurement ID')
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
}
