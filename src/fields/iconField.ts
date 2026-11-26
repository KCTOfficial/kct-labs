import type { TextField } from 'payload'

import { appIconNames } from './appIcons'

/** Importmap path of the admin picker (see `src/fields/IconPicker/IconPickerField.tsx`). */
export const ICON_PICKER_COMPONENT = '@/fields/IconPicker/IconPickerField#IconPickerField'

/**
 * Validation message for an icon name, or `null` when it is valid. Icons are optional, so empty
 * values pass; anything else must be a name of `allowed` (also blocks values sent straight to the API).
 */
export const iconNameError = (value: unknown, allowed: readonly string[]): string | null => {
  if (value === undefined || value === null || value === '') return null
  return typeof value === 'string' && allowed.includes(value)
    ? null
    : 'Choose an icon from the list.'
}

/**
 * Optional icon chosen through the admin popup picker. A `text` field (not a `select`) so adding
 * icons to the append-only registry never needs a database migration.
 */
export const iconField = ({ admin, ...overrides }: Partial<TextField> = {}): TextField =>
  ({
    name: 'icon',
    type: 'text',
    localized: false,
    // `admin` overrides (e.g. a description) are merged, so the picker component always stays.
    admin: { components: { Field: ICON_PICKER_COMPONENT }, custom: { iconSet: 'app' }, ...admin },
    validate: (value: unknown) => iconNameError(value, appIconNames) ?? true,
    ...overrides,
  }) as TextField
