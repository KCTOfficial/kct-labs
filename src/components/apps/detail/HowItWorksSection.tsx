import { ArrowRight } from 'lucide-react'
import React from 'react'

import { ButtonLink } from '@/components/site/ButtonLink'
import { Eyebrow } from '@/components/site/Eyebrow'
import { PhoneFrame } from '@/components/site/PhoneFrame'
import { format, type Dictionary } from '@/i18n'
import { cn } from '@/utilities/ui'

import { ACCENT_PILL_BUTTON } from './accentButton'
import type { DetailSections } from './model'

/** Every phone leans a little to the left (design). Purely decorative. */
const PHONE_TILT = '-rotate-3'

/**
 * Numbered steps with a screenshot each, an arrow between the cards (design). Hidden without steps.
 * The explore button scrolls to the key features, so it is only offered when that section exists.
 */
export const HowItWorksSection: React.FC<{
  data: DetailSections['howItWorks']
  featuresHref: string | null
  dict: Dictionary
}> = ({ data, featuresHref, dict }) => {
  if (!data) return null
  return (
    <section
      aria-labelledby="how-it-works-title"
      className="site-container py-10 lg:py-[var(--section-y)]"
      data-section="how-it-works"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center lg:gap-14">
        <div className="flex min-w-0 flex-col items-start gap-4">
          {data.title && <Eyebrow tone="accent">{dict.detail.howItWorks}</Eyebrow>}
          <h2
            className="break-words font-display text-title font-semibold leading-tight tracking-[-0.02em] text-foreground"
            id="how-it-works-title"
          >
            {data.title ?? dict.detail.howItWorks}
          </h2>
          {data.description && (
            <p className="break-words text-base leading-relaxed text-text-secondary">
              {data.description}
            </p>
          )}
          {featuresHref && (
            <ButtonLink className={ACCENT_PILL_BUTTON} href={featuresHref} variant="ghost">
              {dict.detail.exploreFeatures}
              <ArrowRight aria-hidden="true" className="size-[18px] text-app-accent-text" />
            </ButtonLink>
          )}
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {data.steps.map((step, index) => (
            <li
              className={cn(
                'relative flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-gradient-to-b from-app-accent-soft to-surface p-5 text-left',
                // Without a phone the corner badge would sit on top of the title.
                !step.image && 'pt-14',
              )}
              key={`${index}-${step.title}`}
            >
              <span
                aria-hidden="true"
                className="absolute left-4 top-4 inline-flex size-7 items-center justify-center rounded-full bg-app-accent text-sm font-bold text-background"
              >
                {index + 1}
              </span>
              {step.image && (
                // The phone is cropped by this box (design): only the top part of the device shows.
                <div className="relative -mx-1 aspect-[4/3] overflow-hidden" data-step-phone="">
                  <PhoneFrame
                    className={cn(
                      'absolute left-1/2 top-[6%] w-[56%] -translate-x-1/2 shadow-[0_12px_24px_rgba(0,0,0,0.35)]',
                      PHONE_TILT,
                    )}
                    image={step.image}
                    notch
                    sizes="(min-width: 1024px) 200px, 50vw"
                  />
                </div>
              )}
              <h3 className="flex items-center gap-2.5 font-display text-base font-semibold text-foreground">
                <span
                  aria-hidden="true"
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-app-accent text-xs font-bold text-background"
                >
                  {index + 1}
                </span>
                <span className="sr-only">
                  {format(dict.detail.stepNumber, { n: index + 1 })}:{' '}
                </span>
                <span className="min-w-0 break-words">{step.title}</span>
              </h3>
              {step.description && (
                <p className="break-words text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              )}
              {index < data.steps.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="absolute -right-[1.65rem] top-1/2 hidden size-5 -translate-y-1/2 text-app-accent-text lg:block"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
