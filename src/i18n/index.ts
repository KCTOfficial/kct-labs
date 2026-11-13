import type { Locale } from './config'
import { en, type Dictionary } from './dictionaries/en'
import { id } from './dictionaries/id'

export * from './config'
export type { Dictionary }

const dictionaries: Record<Locale, Dictionary> = { en, id }

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale]

/** Replaces `{name}` placeholders. Missing values are left visible to surface translation bugs. */
export const format = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
