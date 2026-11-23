import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

import type { DocumentType } from '@/payload-types'
import { APP_DOCUMENTS_CACHE_TAG } from '@/utilities/legal/constants'

// Type title/icon/sortOrder are rendered inside every cached legal-document list and page.
// The sitemap only lists document slugs/dates, so its tag is left alone.
export const revalidateDocumentType: CollectionAfterChangeHook<DocumentType> = ({
  doc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc
  payload.logger.info(`Revalidating legal documents for type: ${doc.slug}`)
  revalidateTag(APP_DOCUMENTS_CACHE_TAG, 'max')
  return doc
}

export const revalidateDocumentTypeDelete: CollectionAfterDeleteHook<DocumentType> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate) revalidateTag(APP_DOCUMENTS_CACHE_TAG, 'max')
  return doc
}
