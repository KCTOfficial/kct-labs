/** Pure validators shared by Payload field `validate` functions and unit tests. */

const PACKAGE_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/
const DOWNLOADS_PATTERN = /^\d[\d.,]*\s*[KMBkmb]?\+?$/
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,19}$/

export const PACKAGE_ID_MAX_LENGTH = 150

export const isValidPackageId = (value: string): boolean =>
  value.length <= PACKAGE_ID_MAX_LENGTH && PACKAGE_ID_PATTERN.test(value)

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export const isHttpsUrl = (value: string): boolean => parseUrl(value)?.protocol === 'https:'

export const isPlayStoreUrl = (value: string): boolean => {
  const url = parseUrl(value)
  return Boolean(url && url.protocol === 'https:' && url.hostname === 'play.google.com')
}

/** Accepts absolute https URLs or site-relative paths (`/apps`). Rejects `javascript:` and friends. */
export const isSafeHref = (value: string): boolean =>
  (value.startsWith('/') && !value.startsWith('//')) ||
  isHttpsUrl(value) ||
  value.startsWith('mailto:')

export const isValidDownloadsLabel = (value: string): boolean =>
  DOWNLOADS_PATTERN.test(value.trim())

export const isValidPhone = (value: string): boolean => PHONE_PATTERN.test(value.trim())

/** Digits only, `0812…` → `62812…` (Indonesian local format) for wa.me links. */
export const toWhatsAppNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

const MULTIPLIERS: Record<string, number> = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }

/**
 * Parses a Play Store style downloads label (`100+`, `1,000+`, `10K+`) into a number.
 * Returns `null` for empty, invalid or zero values so the UI can show "Just released" instead.
 */
export const parseDownloads = (label: string | null | undefined): number | null => {
  if (!label) return null
  const trimmed = label.trim()
  if (!isValidDownloadsLabel(trimmed)) return null

  const match = trimmed.match(/^([\d.,]+)\s*([KMBkmb])?/)
  if (!match) return null

  const base = Number(match[1].replace(/[.,]/g, ''))
  const multiplier = match[2] ? MULTIPLIERS[match[2].toLowerCase()] : 1
  const value = base * multiplier

  return Number.isFinite(value) && value > 0 ? value : null
}

type ValidateResult = true | string

/** Wraps a predicate into a Payload `validate` function for optional text fields. */
export const optionalText =
  (predicate: (value: string) => boolean, message: string) =>
  (value: unknown): ValidateResult => {
    if (value === null || value === undefined || value === '') return true
    if (typeof value !== 'string') return message
    return predicate(value) || message
  }

/**
 * `required` on a localized field means "required in every locale". Translations here are optional
 * (missing ones fall back to English), so localized fields are only required in the default locale.
 */
export const requiredInDefaultLocale =
  (defaultLocale: string, message = 'This field is required in the default language.') =>
  (value: unknown, { req }: { req: { locale?: string | null } }): ValidateResult => {
    const isDefault = !req.locale || req.locale === defaultLocale || req.locale === 'all'
    if (!isDefault) return true
    if (value === null || value === undefined) return message
    if (typeof value === 'string' && value.trim() === '') return message
    return true
  }
