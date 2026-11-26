import type { SelectField } from 'payload'

/**
 * Allowlist of Lucide icons for the Home global (a Postgres enum: changing it needs a migration, so it
 * stays at these 20). Every name must also exist in `appIconNames` (`appIcons.ts`), which `SiteIcon`
 * renders; a test enforces it.
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
    // Same popup picker as the app icons, limited to this enum's 20 names (no schema change).
    admin: {
      components: { Field: '@/fields/IconPicker/IconPickerField#IconPickerField' },
      custom: { iconSet: 'site' },
    },
    defaultValue: 'sparkles',
    options: siteIconNames.map((value) => ({ label: value, value })),
    required: true,
    ...overrides,
  }) as SelectField
