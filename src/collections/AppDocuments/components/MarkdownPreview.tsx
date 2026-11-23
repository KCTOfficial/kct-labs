'use client'

import type { ReactNode } from 'react'

const HEADING = /^(#{1,6})\s+(.*)$/
const LIST_ITEM = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/

/**
 * Dependency-free outline preview (headings, lists, paragraphs) rendered as React text nodes, so
 * untrusted markdown never reaches innerHTML. The public page uses the full server renderer.
 */
export const MarkdownPreview = ({ value }: { value: string }) => {
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flush = () => {
    if (paragraph.length) blocks.push(<p key={blocks.length}>{paragraph.join(' ')}</p>)
    if (list.length) {
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>,
      )
    }
    paragraph = []
    list = []
  }

  for (const line of value.split(/\r?\n/)) {
    const heading = HEADING.exec(line)
    const item = LIST_ITEM.exec(line)
    if (heading) {
      flush()
      // Shifted one level so the preview never adds a second h1 to the admin page.
      const Tag = `h${Math.min(heading[1].length + 1, 6)}` as 'h2'
      blocks.push(<Tag key={blocks.length}>{heading[2]}</Tag>)
    } else if (item) {
      if (paragraph.length) flush()
      list.push(item[1])
    } else if (!line.trim()) {
      flush()
    } else {
      if (list.length) flush()
      paragraph.push(line.trim())
    }
  }
  flush()

  return (
    <div className="markdown-field__preview" data-markdown-preview>
      {blocks.length ? blocks : <p>Nothing to preview yet.</p>}
    </div>
  )
}
