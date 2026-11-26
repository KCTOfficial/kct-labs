'use client'

import { Banner, Button, toast, useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import { useState } from 'react'

import { defaultLocale, isLocale, localeLabels } from '@/i18n/config'
import { legalFallbackLocales } from '@/utilities/legal/contentLocales'
import { hasMarkdownContent } from '@/utilities/legal/validation'

import { useAdminApi } from './useAdminApi'
import './legalAdmin.scss'

type SourceDoc = { markdown?: string | null; title?: string | null }

/**
 * Locale without markdown: the public page shows another language until this is filled (spec §6,
 * EDIT-2). Usually the English tab (source: Indonesian, the default); for legacy English-only
 * documents also the Indonesian tab (source: English).
 */
export const LocaleFallbackBanner = () => {
  const { code } = useLocale()
  const { id } = useDocumentInfo()
  const markdown = useField<string>({ path: 'markdown' })
  const title = useField<string>({ path: 'title' })
  const api = useAdminApi()
  const [isCopying, setIsCopying] = useState(false)

  const hasId = id !== undefined && id !== null
  if (!isLocale(code) || hasMarkdownContent(markdown.value)) return null
  // A new document in the default locale has no other language to fall back to yet.
  if (code === defaultLocale && !hasId) return null

  const [source] = legalFallbackLocales(code)
  const sourceLabel = localeLabels[source]

  const copyFromSource = async () => {
    if (!hasId) return
    setIsCopying(true)
    let doc: SourceDoc | null
    try {
      // Drafts included: the editor copies the latest source text, not only what is live.
      doc = await api<SourceDoc>(
        `/app-documents/${encodeURIComponent(String(id))}?locale=${source}&fallback-locale=none&depth=0&draft=true&select[markdown]=true&select[title]=true`,
      )
    } finally {
      setIsCopying(false)
    }
    if (!doc || !hasMarkdownContent(doc.markdown)) {
      toast.error(`${sourceLabel} content could not be loaded.`)
      return
    }
    markdown.setValue(doc.markdown)
    if (!title.value && doc.title) title.setValue(doc.title)
  }

  return (
    <Banner className="legal-admin__banner" type="info">
      <p>
        No {localeLabels[code]} content yet — the public page in this language shows the{' '}
        {sourceLabel} version until this is filled.
      </p>
      {hasId && (
        <Button buttonStyle="secondary" disabled={isCopying} onClick={copyFromSource} size="small">
          Copy from {sourceLabel}
        </Button>
      )}
    </Banner>
  )
}
