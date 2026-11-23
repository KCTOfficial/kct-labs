'use client'

import { Banner, Button, toast, useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import { useState } from 'react'

import { defaultLocale } from '@/i18n/config'
import { hasMarkdownContent } from '@/utilities/legal/validation'

import { useAdminApi } from './useAdminApi'
import './legalAdmin.scss'

type EnglishDoc = { markdown?: string | null; title?: string | null }

/** Non-default locale without markdown: the public page falls back to English (spec §6, EDIT-2). */
export const LocaleFallbackBanner = () => {
  const { code: locale } = useLocale()
  const { id } = useDocumentInfo()
  const markdown = useField<string>({ path: 'markdown' })
  const title = useField<string>({ path: 'title' })
  const api = useAdminApi()
  const [isCopying, setIsCopying] = useState(false)

  if (locale === defaultLocale || hasMarkdownContent(markdown.value)) return null

  const copyFromEnglish = async () => {
    if (id === undefined || id === null) return
    setIsCopying(true)
    // Drafts included: the editor copies the latest English text, not only what is live.
    const doc = await api<EnglishDoc>(
      `/app-documents/${encodeURIComponent(String(id))}?locale=${defaultLocale}&fallback-locale=none&depth=0&draft=true&select[markdown]=true&select[title]=true`,
    )
    setIsCopying(false)
    if (!doc || !hasMarkdownContent(doc.markdown)) {
      toast.error('English content could not be loaded.')
      return
    }
    markdown.setValue(doc.markdown)
    if (!title.value && doc.title) title.setValue(doc.title)
  }

  return (
    <Banner className="legal-admin__banner" type="info">
      <p>
        No Indonesian content yet — the public /id page shows the English version until this is
        filled.
      </p>
      {id !== undefined && id !== null && (
        <Button buttonStyle="secondary" disabled={isCopying} onClick={copyFromEnglish} size="small">
          Copy from English
        </Button>
      )}
    </Banner>
  )
}
