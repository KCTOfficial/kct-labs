import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { LinkProgress } from '@/components/apps/PendingIndicators'
import { format, type Dictionary } from '@/i18n'
import { cn } from '@/utilities/ui'

/** Page numbers to display: first, last, current ±1, with `null` as an ellipsis gap. */
export const pageWindow = (current: number, total: number): Array<number | null> => {
  const pages = new Set(
    [1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total),
  )
  const sorted = [...pages].sort((a, b) => a - b)
  const out: Array<number | null> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
}

const box =
  'relative flex size-10 items-center justify-center rounded-[10px] border font-mono text-sm transition-colors'

const Arrow: React.FC<{
  target: number
  page: number
  totalPages: number
  label: string
  href: string
  children: React.ReactNode
}> = ({ target, page, totalPages, label, href, children }) =>
  target < 1 || target > totalPages ? (
    <span aria-hidden="true" className={cn(box, 'border-border text-text-muted opacity-40')}>
      {children}
    </span>
  ) : (
    <Link
      aria-label={label}
      className={cn(box, 'border-border text-text-secondary hover:border-border-strong')}
      href={href}
      rel={target < page ? 'prev' : 'next'}
    >
      {children}
      <LinkProgress />
    </Link>
  )

export const ListingPagination: React.FC<{
  page: number
  totalPages: number
  hrefFor: (page: number) => string
  dict: Dictionary
}> = ({ page, totalPages, hrefFor, dict }) => {
  if (totalPages <= 1) return null

  return (
    <nav aria-label={dict.a11y.pagination} className="flex justify-center pt-4">
      <ul className="flex items-center gap-2">
        <li>
          <Arrow
            href={hrefFor(page - 1)}
            label={dict.listing.previous}
            page={page}
            target={page - 1}
            totalPages={totalPages}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Arrow>
        </li>
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <li aria-hidden="true" className="px-1 text-text-muted" key={`gap-${i}`}>
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                aria-current={p === page ? 'page' : undefined}
                aria-label={format(dict.listing.pageOf, { page: p, total: totalPages })}
                className={cn(
                  box,
                  p === page
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-text-secondary hover:border-border-strong',
                )}
                href={hrefFor(p)}
              >
                {p}
                <LinkProgress />
              </Link>
            </li>
          ),
        )}
        <li>
          <Arrow
            href={hrefFor(page + 1)}
            label={dict.listing.next}
            page={page}
            target={page + 1}
            totalPages={totalPages}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Arrow>
        </li>
      </ul>
    </nav>
  )
}
