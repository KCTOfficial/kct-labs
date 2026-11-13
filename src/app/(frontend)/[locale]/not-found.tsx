'use client'

import { ArrowLeft } from 'lucide-react'
import { useParams } from 'next/navigation'
import React from 'react'

import { ButtonLink } from '@/components/site/ButtonLink'
import { getDictionary, isLocale, localizeHref } from '@/i18n'

// `not-found` receives no params; the locale is read from the matched route on the client.
export default function NotFound() {
  const params = useParams<{ locale?: string }>()
  const locale = isLocale(params?.locale) ? params.locale : 'en'
  const dict = getDictionary(locale)

  return (
    <div className="bg-blueprint">
      <div className="site-container flex flex-col items-start gap-5 py-28">
        <p className="font-mono text-sm tracking-[0.1em] text-primary">404</p>
        <h1 className="font-display text-4xl font-semibold text-foreground lg:text-5xl">
          {dict.notFound.title}
        </h1>
        <p className="max-w-md text-text-secondary">{dict.notFound.body}</p>
        <ButtonLink href={localizeHref('/', locale)}>
          <ArrowLeft aria-hidden="true" className="size-[18px]" />
          {dict.notFound.goHome}
        </ButtonLink>
      </div>
    </div>
  )
}
