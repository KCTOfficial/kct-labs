import type { CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'

// 'app-documents' is registered in a later step, so the slug is passed loosely until generated types include it.
const APP_DOCUMENTS_SLUG = 'app-documents' as never

export const preventDeleteWhenUsed: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // Nothing can reference this type until the collection is registered.
  if (!req.payload.collections[APP_DOCUMENTS_SLUG]) return

  const { totalDocs } = await req.payload.count({
    collection: APP_DOCUMENTS_SLUG,
    where: { documentType: { equals: id } },
    req,
  })

  if (totalDocs > 0) {
    throw new APIError(
      `This document type is used by ${totalDocs} document(s) and cannot be deleted.`,
      409,
      undefined,
      true,
    )
  }
}
