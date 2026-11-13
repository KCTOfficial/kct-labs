import React from 'react'

import { headerNav } from '@/components/site/navigation'
import { getDictionary, localizeHref, type Locale } from '@/i18n'
import { getCachedLocalizedGlobal } from '@/utilities/getGlobals'

import { HeaderClient } from './Component.client'

export async function Header({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale)
  const [header, footer] = await Promise.all([
    getCachedLocalizedGlobal('header', locale, 1)(),
    getCachedLocalizedGlobal('footer', locale, 0)(),
  ])

  const ctaLabel = header?.cta?.label?.trim()
  const ctaUrl = header?.cta?.url?.trim()
  const contact = [footer?.contact?.email, footer?.contact?.phone].filter(Boolean).join(' · ')

  return (
    <HeaderClient
      contactLine={contact || undefined}
      cta={ctaLabel && ctaUrl ? { label: ctaLabel, href: localizeHref(ctaUrl, locale) } : null}
      dict={{ a11y: dict.a11y, nav: dict.nav }}
      homeHref={localizeHref('/', locale)}
      locale={locale}
      navItems={headerNav(header, dict, locale)}
    />
  )
}
