import type { CollectionAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache'

export const revalidateRedirects: CollectionAfterChangeHook = ({
  doc,
  req: { context, payload },
}) => {
  // Redirects created by other hooks (e.g. legal slug changes) inherit the caller's context.
  if (context.disableRevalidate) return doc

  payload.logger.info(`Revalidating redirects`)

  revalidateTag('redirects', 'max')

  return doc
}
