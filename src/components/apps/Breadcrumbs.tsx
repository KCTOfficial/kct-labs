import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export type Crumb = { label: string; href?: string }

/** Visible breadcrumb; the last item is the current page. Pair with `breadcrumbSchema` JSON-LD. */
export const Breadcrumbs: React.FC<{ items: Crumb[]; label: string }> = ({ items, label }) => (
  <nav aria-label={label}>
    <ol className="flex flex-wrap items-center gap-2 text-[13px]">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <li className="flex items-center gap-2" key={`${item.label}-${i}`}>
            {i > 0 && <ChevronRight aria-hidden="true" className="size-3.5 text-text-muted" />}
            {item.href && !last ? (
              <Link
                className="text-text-muted transition-colors hover:text-foreground"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current={last ? 'page' : undefined} className="text-text-secondary">
                {item.label}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  </nav>
)
