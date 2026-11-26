import React from 'react'

import { AppIcon } from '@/components/site/AppIcon'

import { DetailIcon } from './DetailIcon'
import type { DetailHighlight } from './model'

/**
 * Strip under the hero (design: app block, then up to three icon + title + subtitle cells). Without
 * highlights nothing is rendered: the header already shows the icon and the name.
 */
export const AppHighlightStrip: React.FC<{
  icon: unknown
  name: string
  categoryTitle: string | null
  highlights: DetailHighlight[]
}> = ({ icon, name, categoryTitle, highlights }) => {
  if (highlights.length === 0) return null
  return (
    <div className="site-container py-2 lg:py-4" data-section="highlights">
      <div className="grid overflow-hidden rounded-2xl border border-border bg-surface/80 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3fr)]">
        <div className="flex min-w-0 items-center gap-4 border-b border-border p-5 lg:border-b-0 lg:border-r lg:p-6">
          <AppIcon icon={icon} name={name} size={56} />
          <div className="min-w-0">
            <p className="break-words font-display text-base font-semibold text-foreground">
              {name}
            </p>
            {categoryTitle && (
              <p className="break-words text-sm text-text-secondary">{categoryTitle}</p>
            )}
          </div>
        </div>
        <ul className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {highlights.map((item, index) => (
            <li
              className="flex min-w-0 items-center gap-3 p-5 lg:p-6"
              key={`${index}-${item.title}`}
            >
              <DetailIcon bare fallback="sparkles" name={item.icon} />
              <div className="min-w-0">
                <p className="break-words font-display text-base font-semibold text-foreground">
                  {item.title}
                </p>
                {item.description && (
                  <p className="break-words text-sm text-text-secondary">{item.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
