import type { CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'

export const preventDeleteWhenUsed: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'app-documents',
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
