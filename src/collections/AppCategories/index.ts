import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { anyone } from '../../access/anyone'
import { defaultLocale } from '../../i18n/config'
import { requiredInDefaultLocale } from '../../utilities/apps/validation'
import { authenticated } from '../../access/authenticated'
import { revalidateAppCategory, revalidateAppCategoryDelete } from './hooks/revalidateAppCategory'

export const AppCategories: CollectionConfig<'app-categories'> = {
  slug: 'app-categories',
  labels: { singular: 'App Category', plural: 'App Categories' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  defaultPopulate: {
    title: true,
    slug: true,
  },
  defaultSort: 'sortOrder',
  admin: {
    defaultColumns: ['title', 'slug', 'sortOrder', 'updatedAt'],
    group: 'Apps',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      maxLength: 60,
      validate: requiredInDefaultLocale(defaultLocale),
    },
    {
      name: 'sortOrder',
      type: 'number',
      admin: {
        description: 'Lower numbers appear first in filters.',
        position: 'sidebar',
      },
      defaultValue: 0,
      index: true,
    },
    slugField({ position: 'sidebar' }),
  ],
  hooks: {
    afterChange: [revalidateAppCategory],
    afterDelete: [revalidateAppCategoryDelete],
  },
}
