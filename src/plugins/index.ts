import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { App, Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { SITE_NAME } from '@/utilities/seo/constants'
import { stripLocalizedFlags } from '@/utilities/withoutLocalization'

const generateTitle: GenerateTitle<Post | Page | App> = ({ doc }) => {
  const title = doc && 'name' in doc ? doc.name : doc && 'title' in doc ? doc.title : undefined
  return title ? `${title} | ${SITE_NAME}` : SITE_NAME
}

const generateURL: GenerateURL<Post | Page | App> = ({ collectionConfig, doc }) => {
  const url = getServerSideURL()
  if (!doc?.slug) return url

  const prefix =
    collectionConfig?.slug === 'apps' ? '/apps' : collectionConfig?.slug === 'posts' ? '/posts' : ''

  return `${url}${prefix}/${doc.slug}`
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts', 'apps'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      // Forms predate localization: keep their schema unchanged (see utilities/withoutLocalization).
      fields: ({ defaultFields }) => {
        return stripLocalizedFlags(defaultFields).map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    // Defaults to `true` once localization is enabled, which would move `search.title` into a
    // `search_locales` table. Posts are not translated, so keep the original schema.
    localize: false,
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
]
