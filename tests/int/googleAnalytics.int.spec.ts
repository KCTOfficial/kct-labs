import { describe, expect, it } from 'vitest'

import {
  CONSENT_DENIED_REGIONS,
  buildGaInitScript,
  buildGaScriptSrc,
  parseMeasurementId,
  resolveGaMeasurementId,
  type GaGateInput,
} from '@/utilities/analytics/googleAnalytics'

const VALID_ID = 'G-ABC123DEF4'

const gate = (overrides: Partial<GaGateInput> = {}): GaGateInput => ({
  measurementId: VALID_ID,
  nodeEnv: 'production',
  isPreview: false,
  disallowIndexing: false,
  ...overrides,
})

describe('parseMeasurementId', () => {
  it('accepts a GA4 measurement ID and normalises case/whitespace', () => {
    expect(parseMeasurementId(VALID_ID)).toBe(VALID_ID)
    expect(parseMeasurementId('  g-abc123def4 \n')).toBe(VALID_ID)
  })

  it.each([
    undefined,
    '',
    '   ',
    '16402229086', // numeric Stream ID, the most likely mix-up
    'UA-12345-1', // legacy Universal Analytics
    'GTM-ABC123', // Tag Manager container
    'G-',
    'G-ABC',
    "G-ABC123DEF4');alert(1);//",
    'G-ABC123DEF4</script><script>alert(1)</script>',
  ])('rejects %j', (raw) => {
    expect(parseMeasurementId(raw)).toBeNull()
  })
})

describe('resolveGaMeasurementId', () => {
  it('returns the ID only for a real production visit', () => {
    expect(resolveGaMeasurementId(gate())).toBe(VALID_ID)
  })

  it('stays off outside production builds', () => {
    expect(resolveGaMeasurementId(gate({ nodeEnv: 'development' }))).toBeNull()
    expect(resolveGaMeasurementId(gate({ nodeEnv: 'test' }))).toBeNull()
    expect(resolveGaMeasurementId(gate({ nodeEnv: undefined }))).toBeNull()
  })

  it('stays off in draft/preview mode and on staging', () => {
    expect(resolveGaMeasurementId(gate({ isPreview: true }))).toBeNull()
    expect(resolveGaMeasurementId(gate({ disallowIndexing: true }))).toBeNull()
  })

  it('stays off when the ID is missing or malformed', () => {
    expect(resolveGaMeasurementId(gate({ measurementId: undefined }))).toBeNull()
    expect(resolveGaMeasurementId(gate({ measurementId: '' }))).toBeNull()
    expect(resolveGaMeasurementId(gate({ measurementId: '16402229086' }))).toBeNull()
  })
})

describe('buildGaInitScript', () => {
  const script = buildGaInitScript(VALID_ID)

  it('sets consent defaults BEFORE config so no hit is sent unconsented', () => {
    const consent = script.indexOf("gtag('consent','default'")
    const config = script.indexOf("gtag('config'")
    expect(consent).toBeGreaterThanOrEqual(0)
    expect(consent).toBeLessThan(config)
  })

  it('denies analytics storage for EEA/UK/CH and grants it elsewhere, ads always denied', () => {
    const [regional, global] = [...script.matchAll(/gtag\('consent','default',(\{.*\})\);/g)].map(
      (match) => JSON.parse(match[1]!) as Record<string, unknown>,
    )
    expect(regional).toMatchObject({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
    expect(regional!.region).toEqual([...CONSENT_DENIED_REGIONS])
    expect(global).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' })
    expect(global).not.toHaveProperty('region')
  })

  it('covers the 30 EEA countries plus GB and CH, without duplicates', () => {
    expect(CONSENT_DENIED_REGIONS).toHaveLength(32)
    expect(new Set(CONSENT_DENIED_REGIONS).size).toBe(32)
    expect(CONSENT_DENIED_REGIONS).toEqual(expect.arrayContaining(['DE', 'FR', 'GB', 'CH', 'IS']))
    expect(CONSENT_DENIED_REGIONS).not.toContain('ID')
  })

  it('configures the validated ID with ads signals disabled', () => {
    expect(script).toContain(`gtag('config',"${VALID_ID}",`)
    expect(script).toContain('"allow_google_signals":false')
    expect(script).toContain('"allow_ad_personalization_signals":false')
  })

  it('refuses to build a script for an invalid ID instead of interpolating it', () => {
    expect(() => buildGaInitScript("x');alert(1);//")).toThrow()
    expect(() => buildGaScriptSrc('16402229086')).toThrow()
  })
})

describe('buildGaScriptSrc', () => {
  it('points at the official gtag loader with the encoded ID', () => {
    expect(buildGaScriptSrc(VALID_ID)).toBe(
      `https://www.googletagmanager.com/gtag/js?id=${VALID_ID}`,
    )
  })
})
