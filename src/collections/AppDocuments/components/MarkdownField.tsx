'use client'

import type { CodeFieldClientProps } from 'payload'

import { Button, CodeField, useField, useLocale } from '@payloadcms/ui'
import { useRef, useState, type ChangeEvent } from 'react'

import {
  extractMarkdownTitle,
  isAllowedMarkdownFile,
  validateMarkdown,
} from '@/utilities/legal/validation'

import { MarkdownPreview } from './MarkdownPreview'
import './legalAdmin.scss'

type Mode = 'write' | 'split' | 'preview'

const MODES: Array<{ label: string; value: Mode }> = [
  { label: 'Write', value: 'write' },
  { label: 'Split', value: 'split' },
  { label: 'Preview', value: 'preview' },
]

const readAsUtf8 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.onload = () => {
      try {
        // fatal: invalid UTF-8 throws instead of silently becoming U+FFFD.
        resolve(new TextDecoder('utf-8', { fatal: true }).decode(reader.result as ArrayBuffer))
      } catch {
        reject(new Error('The file is not valid UTF-8 text.'))
      }
    }
    reader.readAsArrayBuffer(file)
  })

/** Markdown source editor with client-side .md upload/download and a preview (spec §6). */
export const MarkdownField = (props: CodeFieldClientProps) => {
  const { path } = props
  const { setValue, value } = useField<string>({ potentiallyStalePath: path })
  const title = useField<string>({ path: 'title' })
  const { code: locale } = useLocale()
  const fileInput = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('write')
  const [error, setError] = useState<string | null>(null)
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null)
  const markdown = typeof value === 'string' ? value : ''

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setSuggestedTitle(null)

    const allowed = isAllowedMarkdownFile(file.name, file.size)
    if (allowed !== true) return setError(allowed)
    let text: string
    try {
      text = await readAsUtf8(file)
    } catch (err) {
      return setError((err as Error).message)
    }
    const valid = validateMarkdown(text, { required: true })
    if (valid !== true) return setError(valid)

    // Replaces the active locale only; earlier content stays recoverable through Versions.
    setValue(text)
    const detected = extractMarkdownTitle(text)
    if (!detected || detected === title.value) return
    if (!title.value) title.setValue(detected)
    else setSuggestedTitle(detected)
  }

  const onDownload = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `document.${locale}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="markdown-field">
      <div aria-label="Markdown tools" className="markdown-field__toolbar" role="toolbar">
        {MODES.map((item) => (
          <Button
            aria-pressed={mode === item.value}
            buttonStyle={mode === item.value ? 'primary' : 'secondary'}
            key={item.value}
            onClick={() => setMode(item.value)}
            size="small"
          >
            {item.label}
          </Button>
        ))}
        <Button buttonStyle="secondary" onClick={() => fileInput.current?.click()} size="small">
          Upload .md
        </Button>
        <Button buttonStyle="secondary" disabled={!markdown} onClick={onDownload} size="small">
          Download .md
        </Button>
        <input
          accept=".md,.markdown,text/markdown"
          className="markdown-field__file"
          data-markdown-upload
          onChange={onUpload}
          ref={fileInput}
          type="file"
        />
      </div>
      {error && (
        <p className="legal-admin__error" role="alert">
          {error}
        </p>
      )}
      {suggestedTitle && (
        <p className="legal-admin__hint">
          Detected title “{suggestedTitle}”.{' '}
          <Button
            buttonStyle="none"
            onClick={() => {
              title.setValue(suggestedTitle)
              setSuggestedTitle(null)
            }}
          >
            Use as title
          </Button>
        </p>
      )}
      <div
        className={`markdown-field__body${mode === 'split' ? ' markdown-field__body--split' : ''}`}
      >
        {mode !== 'preview' && <CodeField {...props} />}
        {mode !== 'write' && <MarkdownPreview value={markdown} />}
      </div>
    </div>
  )
}
