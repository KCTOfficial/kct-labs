'use client'

import { Banner, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { useAdminApi } from '@/collections/AppDocuments/components/useAdminApi'

import '@/collections/AppDocuments/components/legalAdmin.scss'

type TypeDoc = { id: number | string; title?: string | null }
type AppDoc = { documentType?: number | string | { id: number | string } | null }
type List<T> = { docs: T[] }

/** Document types are few; this bounds the query without paginating. */
const TYPE_LIMIT = 100

const typeId = (value: AppDoc['documentType']) =>
  value && typeof value === 'object' ? value.id : value

/** Names the Google Play–required document types this app has not published yet. */
export const MissingRequiredDocsBanner = () => {
  const { id } = useDocumentInfo()
  const api = useAdminApi()
  // Refetch when the join table changes (document added, published or deleted from the drawer).
  const joinSignature = useFormFields(([fields]) =>
    JSON.stringify(fields.legalDocuments?.value ?? null),
  )
  const [missing, setMissing] = useState<TypeDoc[]>([])

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    const requiredQuery = new URLSearchParams({
      'where[requiredForPlay][equals]': 'true',
      depth: '0',
      limit: String(TYPE_LIMIT),
      'select[title]': 'true',
    })
    const publishedQuery = new URLSearchParams({
      'where[app][equals]': String(id),
      'where[_status][equals]': 'published',
      depth: '0',
      limit: String(TYPE_LIMIT),
      'select[documentType]': 'true',
    })
    void Promise.all([
      api<List<TypeDoc>>(`/document-types?${requiredQuery}`, controller.signal),
      api<List<AppDoc>>(`/app-documents?${publishedQuery}`, controller.signal),
    ]).then(([required, published]) => {
      // Unknown state (request failed) shows nothing rather than a misleading warning.
      if (controller.signal.aborted || !required || !published) return
      const have = new Set(published.docs.map((doc) => String(typeId(doc.documentType))))
      setMissing(required.docs.filter((type) => !have.has(String(type.id))))
    })
    return () => controller.abort()
  }, [api, id, joinSignature])

  if (!missing.length) return null

  return (
    <Banner className="legal-admin__banner" type="error">
      {missing.map((type) => (
        <p key={type.id}>
          {type.title ?? 'A required document'} is missing — Google Play requires it.
        </p>
      ))}
    </Banner>
  )
}
