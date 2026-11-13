import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import {
  PACKAGE_ID_MAX_LENGTH,
  isHttpsUrl,
  isPlayStoreUrl,
  isValidDownloadsLabel,
  isValidPackageId,
  optionalText,
  requiredInDefaultLocale,
} from '../../utilities/apps/validation'
import { defaultLocale } from '../../i18n/config'

const requiredDefault = requiredInDefaultLocale(defaultLocale)
import { revalidateAllEndpoint } from './endpoints/revalidateAll'
import { revalidateApp, revalidateAppDelete } from './hooks/revalidateApp'

export const appStatuses = ['live', 'new', 'beta', 'archived'] as const
export const appPlatforms = ['android', 'ios', 'web'] as const

export const Apps: CollectionConfig<'apps'> = {
  slug: 'apps',
  labels: { singular: 'App', plural: 'Apps' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // Used whenever an app is referenced (Home global, related apps): keep it small.
  defaultPopulate: {
    name: true,
    slug: true,
    tagline: true,
    shortDescription: true,
    icon: true,
    screenshots: true,
    category: true,
    status: true,
    downloadsLabel: true,
    playStoreUrl: true,
  },
  defaultSort: 'sortOrder',
  endpoints: [revalidateAllEndpoint],
  admin: {
    defaultColumns: ['name', 'category', 'status', 'featured', 'sortOrder', 'updatedAt'],
    group: 'Apps',
    livePreview: {
      url: ({ data, req }) => generatePreviewPath({ slug: data?.slug, collection: 'apps', req }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({ slug: data?.slug as string, collection: 'apps', req }),
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      admin: { description: 'Product name as published on Google Play (not translated).' },
      maxLength: 80,
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Overview',
          fields: [
            {
              name: 'tagline',
              type: 'text',
              admin: { description: 'One sentence shown under the app name on the detail page.' },
              localized: true,
              maxLength: 160,
              validate: requiredDefault,
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              admin: { description: 'Shown on app cards. Keep it under ~110 characters.' },
              localized: true,
              maxLength: 200,
              validate: requiredDefault,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'icon',
                  type: 'upload',
                  admin: { description: 'Square PNG/WebP, 512×512 recommended.', width: '50%' },
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'category',
                  type: 'relationship',
                  admin: { width: '50%' },
                  index: true,
                  relationTo: 'app-categories',
                  required: true,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'status',
                  type: 'select',
                  admin: {
                    description: 'Archived apps are hidden from listings and the sitemap.',
                    width: '50%',
                  },
                  defaultValue: 'live',
                  // Explicit name: the default `enum_apps_status` collides with the drafts `_status` enum.
                  enumName: 'enum_apps_release_status',
                  index: true,
                  options: [
                    { label: 'Live', value: 'live' },
                    { label: 'New', value: 'new' },
                    { label: 'Beta', value: 'beta' },
                    { label: 'Archived', value: 'archived' },
                  ],
                  required: true,
                },
                {
                  name: 'platforms',
                  type: 'select',
                  admin: { width: '50%' },
                  defaultValue: ['android'],
                  hasMany: true,
                  options: [
                    { label: 'Android', value: 'android' },
                    { label: 'iOS', value: 'ios' },
                    { label: 'Web', value: 'web' },
                  ],
                  required: true,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'downloadsLabel',
                  type: 'text',
                  admin: {
                    description:
                      'As shown on Google Play, e.g. "100+". Empty or "0+" shows "Just released".',
                    width: '50%',
                  },
                  maxLength: 20,
                  validate: optionalText(
                    isValidDownloadsLabel,
                    'Use a format like 100+, 1,000+ or 10K+.',
                  ),
                },
                {
                  name: 'ageRating',
                  type: 'text',
                  admin: { description: 'e.g. "3+"', width: '50%' },
                  maxLength: 20,
                },
              ],
            },
          ],
        },
        {
          label: 'Media',
          fields: [
            {
              name: 'screenshots',
              type: 'upload',
              admin: {
                description:
                  'Portrait screenshots (1080×1920 recommended). The first one is used in showcases.',
              },
              hasMany: true,
              maxRows: 10,
              relationTo: 'media',
            },
          ],
        },
        {
          label: 'Details',
          fields: [
            {
              name: 'description',
              type: 'richText',
              localized: true,
            },
            {
              name: 'features',
              type: 'array',
              admin: { initCollapsed: true },
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  localized: true,
                  maxLength: 120,
                  validate: requiredDefault,
                },
              ],
              maxRows: 12,
            },
            {
              name: 'specs',
              type: 'array',
              admin: {
                description:
                  'Extra rows for the "App information" panel (version, size, languages…). Empty rows are hidden.',
                initCollapsed: true,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      localized: true,
                      maxLength: 60,
                      validate: requiredDefault,
                    },
                    {
                      name: 'value',
                      type: 'text',
                      localized: true,
                      maxLength: 120,
                      validate: requiredDefault,
                    },
                  ],
                },
              ],
              maxRows: 12,
            },
          ],
        },
        {
          label: 'Links',
          fields: [
            {
              name: 'playStoreUrl',
              type: 'text',
              admin: { description: 'https://play.google.com/store/apps/details?id=…' },
              validate: optionalText(isPlayStoreUrl, 'Must be an https://play.google.com URL.'),
            },
            {
              name: 'packageId',
              type: 'text',
              admin: { description: 'Android application ID, e.g. com.kct.quranx' },
              index: true,
              maxLength: PACKAGE_ID_MAX_LENGTH,
              unique: true,
              validate: optionalText(
                isValidPackageId,
                'Invalid package ID (e.g. com.example.app).',
              ),
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'privacyPolicyUrl',
                  type: 'text',
                  admin: { width: '50%' },
                  validate: optionalText(isHttpsUrl, 'Must be an https URL.'),
                },
                { name: 'supportEmail', type: 'email', admin: { width: '50%' } },
              ],
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: true }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      admin: { description: 'Featured apps are listed first.', position: 'sidebar' },
      defaultValue: false,
      index: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      admin: { description: 'Lower numbers appear first.', position: 'sidebar' },
      defaultValue: 0,
      index: true,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: { position: 'sidebar' },
      index: true,
    },
    slugField({ position: 'sidebar', useAsSlug: 'name' }),
  ],
  hooks: {
    afterChange: [revalidateApp],
    afterDelete: [revalidateAppDelete],
    beforeChange: [populatePublishedAt],
  },
  versions: {
    drafts: {
      autosave: { interval: 375 },
      schedulePublish: true,
    },
    maxPerDoc: 30,
  },
}
