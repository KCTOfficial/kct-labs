import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

// The slug is part of public URLs, so it is immutable after creation.
export const lockSlug: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
  if (operation !== 'update' || !originalDoc) return data
  if (typeof data?.slug === 'string' && data.slug !== originalDoc.slug) {
    throw new APIError('The slug of a document type cannot be changed.', 400, undefined, true)
  }
  return data
}
