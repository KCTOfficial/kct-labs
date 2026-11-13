import type { TextField } from 'payload'

/**
 * Optional per-locale label rendered instead of `link.label`. Added next to the existing (non-localized)
 * link field so menus can be translated without migrating the data already stored in `link.label`.
 */
export const localizedLabel: TextField = {
  name: 'localizedLabel',
  type: 'text',
  admin: {
    description: 'Optional: label for the current locale. Falls back to the link label above.',
  },
  localized: true,
  maxLength: 60,
}
