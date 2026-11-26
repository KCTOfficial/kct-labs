'use client'

import { useParams } from 'next/navigation'
import React from 'react'

import { defaultLocale, getDictionary, isLocale } from '@/i18n'

/**
 * Screen-reader loading announcement. `loading.tsx` receives no props, so the locale is read from
 * the route params (same approach as the apps error boundary); falls back to the default locale.
 */
export const LoadingLabel: React.FC = () => {
  const params = useParams<{ locale?: string }>()
  const dict = getDictionary(isLocale(params?.locale) ? params.locale : defaultLocale)

  return (
    <span className="sr-only" role="status">
      {dict.common.loading}
    </span>
  )
}
