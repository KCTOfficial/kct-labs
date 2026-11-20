import Image from 'next/image'
import React from 'react'

import { SITE_NAME } from '@/utilities/seo/constants'

/**
 * Payload admin graphics (`admin.components.graphics` in payload.config.ts).
 * The admin sets `data-theme` on <html>; both wordmark variants are rendered and toggled in
 * `src/app/(payload)/custom.scss` so the right one shows without client JS.
 */
export const AdminLogo: React.FC = () => (
  <span className="kct-hub-admin-logo">
    <Image
      alt={SITE_NAME}
      className="kct-hub-admin-logo__light"
      height={48}
      priority
      src="/brand/kct-hub-logo-light.png"
      width={263}
    />
    <Image
      alt={SITE_NAME}
      className="kct-hub-admin-logo__dark"
      height={48}
      priority
      src="/brand/kct-hub-logo-dark.png"
      width={263}
    />
  </span>
)

/** Square mark in the admin navigation (has its own navy background, readable in both themes). */
export const AdminIcon: React.FC = () => (
  <Image
    alt={SITE_NAME}
    className="kct-hub-admin-icon"
    height={28}
    src="/brand/kct-hub-icon.png"
    width={28}
  />
)
