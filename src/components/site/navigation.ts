import type { Dictionary, Locale } from '@/i18n'
import { localizeHref } from '@/i18n/config'
import type { Footer, Header } from '@/payload-types'

export type NavItem = { label: string; href: string; newTab: boolean }

type LinkValue = NonNullable<Header['navItems']>[number]['link']

/** Mirrors CMSLink's href resolution so header/footer stay consistent with the template links. */
export const resolveLinkHref = (link: LinkValue | null | undefined): string | null => {
  if (!link) return null
  if (link.type === 'reference') {
    const ref = link.reference
    if (ref && typeof ref.value === 'object' && ref.value?.slug) {
      return `${ref.relationTo !== 'pages' ? `/${ref.relationTo}` : ''}/${ref.value.slug}`
    }
    return null
  }
  return link.url || null
}

type Row = { link: LinkValue; localizedLabel?: string | null }

export const toNavItems = (rows: Row[] | null | undefined, locale: Locale): NavItem[] =>
  (rows ?? []).flatMap((row) => {
    const href = resolveLinkHref(row.link)
    const label = row.localizedLabel?.trim() || row.link?.label?.trim()
    if (!href || !label) return []
    return [{ label, href: localizeHref(href, locale), newTab: Boolean(row.link?.newTab) }]
  })

/** Used when the Header global has no items yet, so a fresh install still has working navigation. */
export const defaultNavItems = (dict: Dictionary, locale: Locale): NavItem[] => [
  { label: dict.nav.apps, href: localizeHref('/apps', locale), newTab: false },
]

export const headerNav = (header: Header | null, dict: Dictionary, locale: Locale) => {
  const items = toNavItems(header?.navItems, locale)
  return items.length ? items : defaultNavItems(dict, locale)
}

export const footerColumns = (footer: Footer | null, locale: Locale) =>
  (footer?.columns ?? [])
    .map((column) => ({ title: column.title, links: toNavItems(column.links, locale) }))
    .filter((column) => column.title && column.links.length)
