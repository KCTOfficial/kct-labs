import type { Block, CollectionConfig, Field } from 'payload'

/**
 * Enabling `config.localization` makes every field flagged `localized: true` move into `*_locales`
 * tables in Postgres. Some fields of the pre-existing template collections are flagged by plugins
 * (SEO meta fields, form-builder labels/messages). To keep those schemas — and the data already
 * stored in them — exactly as before, this recursively forces `localized: false` on a field tree.
 *
 * Only apply this to collections that existed before localization was introduced.
 */
export const stripLocalizedFlags = (fields: Field[]): Field[] =>
  fields.map((field) => {
    const next = { ...field } as Field & {
      blocks?: Block[]
      fields?: Field[]
      localized?: boolean
      tabs?: Array<{ fields: Field[] }>
    }

    if ('localized' in next && next.localized) next.localized = false
    if (Array.isArray(next.fields)) next.fields = stripLocalizedFlags(next.fields)
    if (Array.isArray(next.tabs)) {
      next.tabs = next.tabs.map((tab) => ({ ...tab, fields: stripLocalizedFlags(tab.fields) }))
    }
    if (Array.isArray(next.blocks)) {
      next.blocks = next.blocks.map((block) => ({
        ...block,
        fields: stripLocalizedFlags(block.fields),
      }))
    }

    return next as Field
  })

export const withoutLocalization = <T extends CollectionConfig>(collection: T): T => ({
  ...collection,
  fields: stripLocalizedFlags(collection.fields),
})
