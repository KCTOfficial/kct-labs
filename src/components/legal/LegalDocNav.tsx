import {
  FileCheck,
  FileText,
  Lock,
  ScrollText,
  ShieldCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { LegalIcon } from '@/utilities/legal/constants'
import { cn } from '@/utilities/ui'

export const LEGAL_ICON_COMPONENTS: Record<LegalIcon, LucideIcon> = {
  'shield-check': ShieldCheck,
  'scroll-text': ScrollText,
  'file-check': FileCheck,
  'user-x': UserX,
  lock: Lock,
  'file-text': FileText,
}

export type LegalNavItem = { href: string; title: string; icon: LegalIcon; isCurrent: boolean }

/** The app's legal documents; the current one is marked with `aria-current`. */
export const LegalDocNav: React.FC<{
  items: LegalNavItem[]
  label: string
  allHref: string
  allLabel: string
}> = ({ items, label, allHref, allLabel }) => (
  <nav aria-label={label} className="flex flex-col gap-3">
    <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">{label}</p>
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = LEGAL_ICON_COMPONENTS[item.icon] ?? FileText
        return (
          <li key={item.href}>
            <Link
              aria-current={item.isCurrent ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                item.isCurrent
                  ? 'bg-primary-soft font-medium text-foreground'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-foreground',
              )}
              href={item.href}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              {item.title}
            </Link>
          </li>
        )
      })}
    </ul>
    <Link className="px-3 text-sm font-medium text-primary" href={allHref}>
      {allLabel}
    </Link>
  </nav>
)
