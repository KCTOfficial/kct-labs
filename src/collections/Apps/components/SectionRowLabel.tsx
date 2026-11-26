'use client'

import { useRowLabel } from '@payloadcms/ui'
import type { LucideIcon } from 'lucide-react'
import React from 'react'

import { ICON_MAP } from '@/components/site/iconMap'

import './sectionRowLabel.scss'

type Props = {
  /** Field of the row that names it (`title` for highlights/steps, `label` for features). */
  titleKey: 'title' | 'label'
  /** Shown while the row has no name yet, e.g. "Feature". */
  fallback: string
  /** Also draw the row's chosen icon in front of the name. */
  showIcon?: boolean
}

/**
 * Row title in the admin lists of the page sections: "01 · <icon> Name" instead of Payload's generic
 * "Feature 01", so a collapsed row says what it is. Reads the live form values of the current locale.
 */
export const SectionRowLabel: React.FC<Props> = ({ titleKey, fallback, showIcon = false }) => {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
  const name = typeof data?.[titleKey] === 'string' ? (data[titleKey] as string).trim() : ''
  const iconName = typeof data?.icon === 'string' ? data.icon : ''
  const Icon =
    showIcon && iconName
      ? (ICON_MAP as Record<string, LucideIcon | undefined>)[iconName]
      : undefined
  const number = String((rowNumber ?? 0) + 1).padStart(2, '0')

  return (
    <span className="section-row-label">
      <span className="section-row-label__number">{number}</span>
      {Icon ? <Icon aria-hidden="true" className="section-row-label__icon" /> : null}
      <span className={name ? undefined : 'section-row-label__empty'}>{name || fallback}</span>
    </span>
  )
}
