export const PRIVACY_POLICY_TYPE_SLUG = 'privacy-policy'

export const LEGAL_ICONS = [
  'shield-check',
  'scroll-text',
  'file-check',
  'user-x',
  'lock',
  'file-text',
] as const

export type LegalIcon = (typeof LEGAL_ICONS)[number]

export const APP_DOCUMENTS_CACHE_TAG = 'app-documents'
