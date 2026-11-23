import type { CollectionConfig, FieldHook, FilterOptions } from 'payload'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { defaultLocale } from '../../i18n/config'
import { SLUG_MAX_LENGTH } from '../../utilities/apps/appPath'
import { requiredInDefaultLocale } from '../../utilities/apps/validation'
import { legalEditor } from '../../utilities/legal/lexical'
import { isValidDocSlug, validateMarkdown } from '../../utilities/legal/validation'
import { convertMarkdown } from './hooks/convertMarkdown'
import { capturePublishedSlug, redirectOnSlugChange } from './hooks/redirectOnSlugChange'
import { revalidateAppDocument, revalidateAppDocumentDelete } from './hooks/revalidateAppDocument'
import { stampEffectiveDate } from './hooks/stampEffectiveDate'

const COPY_SUFFIX = '-copy'

const relationId = (value: unknown): number | string | undefined => {
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: number }).id
  return typeof value === 'number' || typeof value === 'string' ? value : undefined
}

/** Each document type can be used once per app; the type of the edited document stays selectable. */
const unusedDocumentTypes: FilterOptions = async ({ data, id, req }) => {
  const appId = relationId(data?.app)
  if (appId === undefined) return true

  const used = await req.payload.find({
    collection: 'app-documents',
    where: {
      and: [{ app: { equals: appId } }, ...(id ? [{ id: { not_equals: id } }] : [])],
    },
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    select: { documentType: true },
  })
  const usedIds = used.docs
    .map((doc) => relationId(doc.documentType))
    .filter((value) => value !== undefined)
  return usedIds.length ? { id: { not_in: usedIds } } : true
}

const defaultSlugFromType: FieldHook = async ({ value, siblingData, req }) => {
  if (value) return value
  const typeId = relationId(siblingData?.documentType)
  if (typeId === undefined) return value
  const type = await req.payload.findByID({
    collection: 'document-types',
    id: typeId,
    depth: 0,
    overrideAccess: true,
    req,
    select: { slug: true },
  })
  return type?.slug ?? value
}

const copySlug: FieldHook = ({ value }) =>
  typeof value === 'string'
    ? `${value.slice(0, SLUG_MAX_LENGTH - COPY_SUFFIX.length)}${COPY_SUFFIX}`
    : value

export const AppDocuments: CollectionConfig<'app-documents'> = {
  slug: 'app-documents',
  labels: { singular: 'App Document', plural: 'App Documents' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  defaultPopulate: {
    title: true,
    slug: true,
    documentType: true,
    effectiveDate: true,
  },
  admin: {
    defaultColumns: ['title', 'app', 'documentType', '_status', 'updatedAt'],
    components: {
      edit: {
        beforeDocumentControls: [
          '@/collections/AppDocuments/components/LocaleFallbackBanner#LocaleFallbackBanner',
        ],
      },
    },
    group: 'Apps',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'deleteImpact',
      type: 'ui',
      admin: {
        components: {
          Field: '@/collections/AppDocuments/components/DeleteImpactBanner#DeleteImpactBanner',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'app',
          type: 'relationship',
          admin: { width: '50%' },
          // Cleared on duplicate so the copy cannot collide on app+type; it must be picked again.
          hooks: { beforeDuplicate: [() => null] },
          index: true,
          relationTo: 'apps',
          required: true,
        },
        {
          name: 'documentType',
          type: 'relationship',
          admin: { width: '50%' },
          filterOptions: unusedDocumentTypes,
          index: true,
          relationTo: 'document-types',
          required: true,
        },
      ],
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      maxLength: 120,
      validate: requiredInDefaultLocale(defaultLocale),
    },
    {
      name: 'markdown',
      type: 'code',
      admin: {
        components: {
          Field: '@/collections/AppDocuments/components/MarkdownField#MarkdownField',
        },
        language: 'markdown',
      },
      localized: true,
      // With `locale: 'all'` Payload validates each locale separately with `req.locale` scoped to it
      // (fields/hooks/beforeChange/promise.js); 'all' only reaches here for an empty object.
      validate: (value: string | null | undefined, { req }) =>
        validateMarkdown(value, {
          required: !req.locale || req.locale === defaultLocale || req.locale === 'all',
        }),
    },
    {
      name: 'content',
      type: 'richText',
      admin: { hidden: true },
      editor: legalEditor,
      localized: true,
    },
    {
      type: 'tabs',
      tabs: [
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
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Lowercase kebab-case. Defaults to the document type slug.',
        position: 'sidebar',
      },
      hooks: {
        beforeDuplicate: [copySlug],
        beforeValidate: [defaultSlugFromType],
      },
      index: true,
      maxLength: SLUG_MAX_LENGTH,
      required: true,
      validate: (value: string | null | undefined) =>
        isValidDocSlug(value) ||
        'Use lowercase letters, numbers and hyphens (e.g. privacy-policy).',
    },
    {
      name: 'publicUrl',
      type: 'ui',
      admin: {
        components: {
          Field: '@/collections/AppDocuments/components/PublicUrlField#PublicUrlField',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'effectiveDate',
      type: 'date',
      admin: {
        description: 'Shown as "Last updated". Set automatically when markdown changes on publish.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [redirectOnSlugChange, revalidateAppDocument],
    afterDelete: [revalidateAppDocumentDelete],
    beforeChange: [convertMarkdown, capturePublishedSlug, stampEffectiveDate],
  },
  indexes: [
    { fields: ['app', 'slug'], unique: true },
    { fields: ['app', 'documentType'], unique: true },
  ],
  versions: {
    drafts: {
      autosave: { interval: 375 },
      schedulePublish: true,
    },
    maxPerDoc: 30,
  },
}
