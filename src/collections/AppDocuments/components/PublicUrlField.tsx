'use client'

import { CopyToClipboard, FieldLabel, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { getServerSideURL } from '@/utilities/getURL'
import { legalDocPath } from '@/utilities/legal/paths'

import { useAdminApi } from './useAdminApi'
import './legalAdmin.scss'

const relationId = (value: unknown): number | string | null => {
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: number }).id
  return typeof value === 'number' || typeof value === 'string' ? value : null
}

/** Read-only public URL (Indonesian = default locale, no prefix) of a published document + copy. */
export const PublicUrlField = () => {
  const { hasPublishedDoc } = useDocumentInfo()
  const appId = useFormFields(([fields]) => relationId(fields.app?.value))
  const docSlug = useFormFields(([fields]) => fields.slug?.value as string | undefined)
  const api = useAdminApi()
  // Keyed by app id so a stale slug is never shown after the app relation changes.
  const [loaded, setLoaded] = useState<{ appId: number | string; slug: string | null } | null>(null)

  useEffect(() => {
    if (appId === null) return
    const controller = new AbortController()
    void api<{ slug?: string }>(
      `/apps/${encodeURIComponent(String(appId))}?depth=0&select[slug]=true`,
      controller.signal,
    ).then((app) => {
      if (!controller.signal.aborted) setLoaded({ appId, slug: app?.slug ?? null })
    })
    return () => controller.abort()
  }, [api, appId])

  const appSlug = loaded && loaded.appId === appId ? loaded.slug : null
  if (!appSlug || !docSlug) return null
  // The canonical public origin (NEXT_PUBLIC_SERVER_URL), not the admin host.
  const url = `${getServerSideURL()}${legalDocPath(appSlug, docSlug)}`

  return (
    <div className="field-type">
      <FieldLabel label="Public URL" />
      <div className="legal-admin__url" data-public-url>
        <span>{url}</span>
        <CopyToClipboard value={url} />
      </div>
      {!hasPublishedDoc && <p className="legal-admin__hint">Live after the first publish.</p>}
    </div>
  )
}
