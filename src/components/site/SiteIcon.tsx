import { Sparkles, type LucideProps } from 'lucide-react'
import React from 'react'

import { isAppIconName } from '@/fields/appIcons'

import { ICON_MAP } from './iconMap'

/**
 * Renders a CMS-selected icon (any name of the app icon registry). Unknown, empty or legacy values
 * fall back to `sparkles` instead of crashing. Server Components only (see `iconMap.ts`).
 */
export const SiteIcon: React.FC<{ name?: string | null } & Omit<LucideProps, 'name'>> = ({
  name,
  ...props
}) => {
  const Icon = isAppIconName(name) ? ICON_MAP[name] : Sparkles
  return <Icon aria-hidden="true" {...props} />
}
