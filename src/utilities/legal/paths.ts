/** Pure and client-safe: locale-less public paths (wrap with `localizeHref` for links). */

export const legalIndexPath = (appSlug: string): string => `/apps/${appSlug}/legal`

export const legalDocPath = (appSlug: string, docSlug: string): string =>
  `${legalIndexPath(appSlug)}/${docSlug}`
