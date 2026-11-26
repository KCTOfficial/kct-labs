import { ArrowRight, FileCheck, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { Dictionary } from '@/i18n'

import type { DetailSections } from './model'

/**
 * Data and privacy banner (design: accent motif, document tile on the left, shield on the right).
 * Hidden unless both title and text are set. It links to the app's legal documents when it has any
 * (`learnMoreHref`); there is no free-form URL to mistype or abuse.
 */
export const DataControlBanner: React.FC<{
  data: DetailSections['dataControl']
  learnMoreHref: string | null
  dict: Dictionary
}> = ({ data, learnMoreHref, dict }) => {
  if (!data) return null
  return (
    <section
      aria-labelledby="data-control-title"
      className="site-container py-6 lg:py-10"
      data-section="data-control"
    >
      <div className="relative isolate overflow-hidden rounded-3xl border border-app-accent/50">
        <div
          aria-hidden="true"
          className="accent-motif-banner pointer-events-none absolute inset-0 -z-10"
          data-motif="banner"
        />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center lg:gap-10 lg:px-12 lg:py-10">
          <span
            aria-hidden="true"
            className="inline-flex size-20 shrink-0 items-center justify-center rounded-2xl bg-surface/70 text-app-accent-text shadow-sm lg:size-24"
          >
            <FileCheck className="size-10 lg:size-12" strokeWidth={1.5} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <h2
              className="break-words font-display text-2xl font-semibold text-foreground"
              id="data-control-title"
            >
              {data.title}
            </h2>
            <p className="max-w-2xl break-words text-base leading-relaxed text-text-secondary">
              {data.description}
            </p>
            {learnMoreHref && (
              <Link
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-app-accent-text hover:underline"
                href={learnMoreHref}
              >
                {dict.detail.learnMore}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>
          <ShieldCheck
            aria-hidden="true"
            className="hidden size-28 shrink-0 text-app-accent-text/40 lg:block"
            strokeWidth={1}
          />
        </div>
      </div>
    </section>
  )
}
