'use client'

import { Globe } from 'lucide-react'
import { usePathname } from 'next/navigation'
import React from 'react'

import { localeLabels, localizeHref, locales, stripLocale, type Locale } from '@/i18n/config'
import { cn } from '@/utilities/ui'

/** Locale-switched path for the current page. */
const useLocaleHrefs = () => {
  const basePath = stripLocale(usePathname() || '/')
  return (locale: Locale) => localizeHref(basePath, locale)
}

/**
 * Appends the current query string (filters, pagination…) at click time. Reading it during render
 * would need `useSearchParams`, which opts static pages out of prerendering.
 */
const keepQuery = (event: React.MouseEvent<HTMLAnchorElement>) => {
  const { search } = window.location
  if (search) event.currentTarget.href = `${event.currentTarget.pathname}${search}`
}

/** Segmented `ID | EN` control (desktop header, footer, mobile menu). */
export const LanguageSwitch: React.FC<{ current: Locale; label: string; className?: string }> = ({
  current,
  label,
  className,
}) => {
  const hrefFor = useLocaleHrefs()

  return (
    <nav
      aria-label={label}
      className={cn('inline-flex rounded-[12px] border border-border-strong p-[3px]', className)}
    >
      {[...locales].reverse().map((locale) => {
        const active = locale === current
        return (
          <a
            aria-current={active ? 'true' : undefined}
            className={cn(
              'flex h-[34px] w-10 items-center justify-center rounded-[9px] font-mono text-xs font-semibold uppercase tracking-[0.05em] transition-colors',
              active ? 'bg-primary-soft text-primary' : 'text-text-muted hover:text-foreground',
            )}
            href={hrefFor(locale)}
            hrefLang={locale}
            key={locale}
            onClick={keepQuery}
            lang={locale}
            title={localeLabels[locale]}
          >
            {locale}
          </a>
        )
      })}
    </nav>
  )
}

/** Compact mobile button: shows the current locale, links to the other one. */
export const LanguageToggleButton: React.FC<{ current: Locale; label: string }> = ({
  current,
  label,
}) => {
  const hrefFor = useLocaleHrefs()
  const next = locales.find((l) => l !== current) ?? current

  return (
    <a
      // The accessible name must contain the visible text (WCAG 2.5.3 Label in Name).
      aria-label={`${current.toUpperCase()} — ${label}: ${localeLabels[next]}`}
      className="inline-flex h-11 items-center gap-1.5 rounded-[12px] border border-border-strong px-3 font-mono text-xs font-semibold uppercase"
      href={hrefFor(next)}
      hrefLang={next}
      lang={next}
      onClick={keepQuery}
    >
      <Globe aria-hidden="true" className="size-4 text-text-secondary" />
      {current}
    </a>
  )
}
