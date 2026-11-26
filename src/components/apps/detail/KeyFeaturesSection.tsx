import React from 'react'

import { Eyebrow } from '@/components/site/Eyebrow'
import type { Dictionary } from '@/i18n'

import { DetailIcon } from './DetailIcon'
import type { DetailSections } from './model'

/**
 * Key features (design: intro on the left, a grid of compact icon cards on the right). The heading
 * and intro are CMS text with the dictionary heading as fallback; the `h2` carries `id="features"`
 * for the "explore" anchor.
 */
export const KeyFeaturesSection: React.FC<{
  intro: DetailSections['featuresIntro']
  features: DetailSections['features']
  dict: Dictionary
}> = ({ intro, features, dict }) => {
  if (features.length === 0) return null
  return (
    <section
      aria-labelledby="features"
      className="site-container py-10 lg:py-[var(--section-y)]"
      data-section="features"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center lg:gap-14">
        <div className="flex min-w-0 flex-col items-start gap-4">
          {intro.title && <Eyebrow tone="accent">{dict.detail.keyFeatures}</Eyebrow>}
          <h2
            className="scroll-mt-24 break-words font-display text-title font-semibold tracking-[-0.02em] text-foreground"
            id="features"
          >
            {intro.title ?? dict.detail.keyFeatures}
          </h2>
          {intro.description && (
            <p className="break-words text-base leading-relaxed text-text-secondary">
              {intro.description}
            </p>
          )}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <li
              className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface/80 p-4"
              key={`${index}-${feature.label}`}
            >
              <DetailIcon bare fallback="check" name={feature.icon} />
              <div className="min-w-0">
                <p className="break-words font-display text-sm font-semibold text-foreground">
                  {feature.label}
                </p>
                {feature.description && (
                  <p className="break-words text-xs text-text-secondary">{feature.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
