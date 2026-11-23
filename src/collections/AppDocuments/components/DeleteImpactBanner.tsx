'use client'

import { Banner, useDocumentInfo } from '@payloadcms/ui'

import './legalAdmin.scss'

/**
 * Payload 3.93 has no override for the delete confirmation modal, so the impact of deleting or
 * unpublishing a live document is shown here, next to the default document controls.
 */
export const DeleteImpactBanner = () => {
  const { hasPublishedDoc } = useDocumentInfo()
  if (!hasPublishedDoc) return null

  return (
    <Banner className="legal-admin__banner" type="error">
      <p>
        This document is live. Deleting or unpublishing it makes its public URL return 404 — update
        the link in Google Play Console first.
      </p>
    </Banner>
  )
}
