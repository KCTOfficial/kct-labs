'use client'

import { useConfig } from '@payloadcms/ui'
import { useCallback } from 'react'

/** Same-origin REST helper for admin components; the admin session cookie authenticates it. */
export const useAdminApi = () => {
  const {
    config: { routes, serverURL },
  } = useConfig()
  const base = `${serverURL ?? ''}${routes.api}`

  return useCallback(
    async <T>(path: string, signal?: AbortSignal): Promise<T | null> => {
      try {
        const res = await fetch(`${base}${path}`, { credentials: 'include', signal })
        return res.ok ? ((await res.json()) as T) : null
      } catch {
        // Aborted or offline: callers treat null as "unknown" and render nothing.
        return null
      }
    },
    [base],
  )
}
