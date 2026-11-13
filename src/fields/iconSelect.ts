import type { SelectField } from 'payload'

/**
 * Allowlist of Lucide icons editors can pick. Keep in sync with `src/components/site/SiteIcon.tsx`
 * (TypeScript enforces it through the `SiteIconName` type).
 */
export const siteIconNames = [
  'workflow',
  'list-checks',
  'plug-zap',
  'search',
  'pen-tool',
  'shield-check',
  'rocket',
  'code',
  'smartphone',
  'cpu',
  'boxes',
  'globe',
  'sparkles',
  'users',
  'briefcase',
  'book-open',
  'wallet',
  'calendar-check',
  'gamepad-2',
  'bar-chart-3',
] as const

export type SiteIconName = (typeof siteIconNames)[number]

export const iconSelect = (overrides: Partial<SelectField> = {}): SelectField =>
  ({
    name: 'icon',
    type: 'select',
    defaultValue: 'sparkles',
    options: siteIconNames.map((value) => ({ label: value, value })),
    required: true,
    ...overrides,
  }) as SelectField
