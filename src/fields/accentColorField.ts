import type { TextField } from 'payload'

import { accentPresetError } from '@/utilities/apps/accent'

/**
 * Per-app accent colour: one of the presets in `src/utilities/apps/accent.ts`, picked from a swatch
 * grid. A `text` field (not a `select`) so new presets never need a database migration.
 */
export const accentColorField = (overrides: Partial<TextField> = {}): TextField =>
  ({
    name: 'accentColor',
    type: 'text',
    localized: false,
    admin: {
      components: { Field: '@/collections/Apps/components/AccentColorField#AccentColorField' },
      description: "Colour of this app's detail page. Empty uses the KCT Hub brand colours.",
    },
    validate: (value: unknown) => accentPresetError(value) ?? true,
    ...overrides,
  }) as TextField
