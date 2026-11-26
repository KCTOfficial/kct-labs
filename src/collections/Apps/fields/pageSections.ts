import type { Field } from 'payload'

import { iconField } from '../../../fields/iconField'
import { defaultLocale } from '../../../i18n/config'
import { MAX_HIGHLIGHTS, MAX_STEPS } from '../../../utilities/apps/sectionLimits'
import { requiredInDefaultLocale } from '../../../utilities/apps/validation'

const requiredDefault = requiredInDefaultLocale(defaultLocale)

/** Row title in the admin: "01 · <icon> Name" instead of Payload's generic "Feature 01". */
const rowLabel = (titleKey: 'title' | 'label', fallback: string, showIcon = false) => ({
  RowLabel: {
    path: '@/collections/Apps/components/SectionRowLabel#SectionRowLabel',
    clientProps: { titleKey, fallback, showIcon },
  },
})

/**
 * Key features of an app: cards with an icon, a name and an optional short line. They live in the
 * Page sections tab with everything else the detail page shows (the field and its data are the same
 * as before; only its place in the admin changed, so no migration).
 */
export const featuresField: Field = {
  name: 'features',
  type: 'array',
  admin: {
    components: rowLabel('label', 'Feature', true),
    description:
      'Cards under "Key features" on the app page: an icon, a name and an optional short line. Up to 12.',
    // Not collapsed: a new row must open ready to fill in (the row title shows each feature's name).
  },
  fields: [
    {
      type: 'row',
      fields: [
        iconField({
          admin: { description: 'Empty shows a check mark.', width: '30%' },
        }),
        {
          name: 'label',
          type: 'text',
          admin: { description: 'The feature name, e.g. "Receipt scan".', width: '70%' },
          localized: true,
          maxLength: 120,
          validate: requiredDefault,
        },
      ],
    },
    {
      name: 'description',
      type: 'text',
      admin: { description: 'Optional short line under the name (max 80 characters).' },
      localized: true,
      maxLength: 80,
    },
  ],
  maxRows: 12,
}

/**
 * Optional page sections of an app (tab "Page sections"). Everything is optional and additive: an
 * app that fills none of them renders without them, and a section without content is hidden.
 * Texts are localized; the Indonesian field falls back to English per field (Payload fallback).
 */
export const pageSectionsFields: Field[] = [
  {
    name: 'highlights',
    type: 'array',
    admin: {
      components: rowLabel('title', 'Highlight', true),
      // Not collapsed: at most 3 rows, and a new row must open ready to fill in.
      description: 'Up to 3 short highlights next to the app name under the hero (icon + 2 lines).',
    },
    fields: [
      {
        type: 'row',
        fields: [
          iconField({ admin: { width: '30%' } }),
          {
            name: 'title',
            type: 'text',
            admin: { width: '70%' },
            localized: true,
            maxLength: 40,
            validate: requiredDefault,
          },
        ],
      },
      { name: 'description', type: 'text', localized: true, maxLength: 60 },
    ],
    maxRows: MAX_HIGHLIGHTS,
  },
  {
    name: 'howItWorks',
    type: 'group',
    admin: { description: 'Numbered steps with a screenshot each. Hidden until a step is added.' },
    fields: [
      { name: 'title', type: 'text', localized: true, maxLength: 80 },
      { name: 'description', type: 'textarea', localized: true, maxLength: 240 },
      {
        name: 'steps',
        type: 'array',
        admin: { components: rowLabel('title', 'Step') },
        fields: [
          {
            name: 'title',
            type: 'text',
            localized: true,
            maxLength: 60,
            validate: requiredDefault,
          },
          { name: 'description', type: 'textarea', localized: true, maxLength: 140 },
          {
            name: 'image',
            type: 'upload',
            admin: { description: 'Screenshot of this step (portrait).' },
            relationTo: 'media',
          },
        ],
        maxRows: MAX_STEPS,
      },
    ],
  },
  {
    name: 'featuresIntro',
    type: 'group',
    admin: {
      description:
        'Heading and intro above the key features. Empty uses the default heading "Key features".',
    },
    fields: [
      { name: 'title', type: 'text', localized: true, maxLength: 100 },
      { name: 'description', type: 'textarea', localized: true, maxLength: 240 },
    ],
  },
  featuresField,
  {
    name: 'dataControl',
    type: 'group',
    admin: {
      description:
        'Banner about data and privacy. Shown only when both fields are filled; it links to the legal documents when the app has any.',
    },
    fields: [
      { name: 'title', type: 'text', localized: true, maxLength: 80 },
      { name: 'description', type: 'textarea', localized: true, maxLength: 240 },
    ],
  },
]
