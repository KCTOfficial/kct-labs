import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { defaultLocale } from '../../i18n/config'
import { requiredInDefaultLocale } from '../../utilities/apps/validation'
import { LEGAL_ICONS } from '../../utilities/legal/constants'
import { lockSlug } from './hooks/lockSlug'
import { preventDeleteWhenUsed } from './hooks/preventDeleteWhenUsed'

export const DocumentTypes: CollectionConfig<'document-types'> = {
  slug: 'document-types',
  labels: { singular: 'Document Type', plural: 'Document Types' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  defaultPopulate: {
    title: true,
    slug: true,
    icon: true,
  },
  defaultSort: 'sortOrder',
  admin: {
    defaultColumns: ['title', 'slug', 'requiredForPlay', 'sortOrder', 'updatedAt'],
    group: 'Apps',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      maxLength: 80,
      validate: requiredInDefaultLocale(defaultLocale),
    },
    {
      name: 'icon',
      type: 'select',
      defaultValue: 'file-text',
      options: LEGAL_ICONS.map((value) => ({ label: value, value })),
    },
    {
      name: 'sortOrder',
      type: 'number',
      admin: {
        description: 'Lower numbers appear first.',
        position: 'sidebar',
      },
      defaultValue: 0,
      index: true,
    },
    {
      name: 'requiredForPlay',
      type: 'checkbox',
      admin: {
        description: 'Google Play requires this document (e.g. Privacy Policy).',
        position: 'sidebar',
      },
      defaultValue: false,
    },
    slugField({
      position: 'sidebar',
      overrides: (field) => {
        const slug = field.fields.find((f) => 'name' in f && f.name === 'slug')
        if (slug && 'admin' in slug) {
          slug.admin = { ...slug.admin, description: 'Cannot be changed after creation.' }
        }
        return field
      },
    }),
  ],
  hooks: {
    beforeChange: [lockSlug],
    beforeDelete: [preventDeleteWhenUsed],
  },
}
