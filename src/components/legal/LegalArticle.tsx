import type {
  DefaultTypedEditorState,
  SerializedAutoLinkNode,
  SerializedLinkNode,
} from '@payloadcms/richtext-lexical'
import type { JSXConverterArgs, JSXConverters } from '@payloadcms/richtext-lexical/react'
import React from 'react'

import RichText from '@/components/RichText'
import { tocHeadingNodes } from '@/utilities/legal/lexical'
import type { LegalTocItem } from './LegalToc'

type Props = {
  content: DefaultTypedEditorState
  toc: LegalTocItem[]
  /** Set when the content language differs from the page locale (EN fallback on `/id`). */
  lang?: string
  children?: React.ReactNode
}

const EXTERNAL_URL = /^https?:\/\//i
const HEADING_TAGS = new Set(['h2', 'h3', 'h4', 'h5', 'h6'])

/**
 * Maps the top-level h2 nodes to the ids `extractToc` issued for them (same nodes, same order),
 * so TOC anchors always match the rendered headings.
 */
const headingIds = (content: DefaultTypedEditorState, toc: LegalTocItem[]) => {
  const ids = new WeakMap<object, string>()
  tocHeadingNodes(content).forEach((node, i) => {
    if (toc[i]) ids.set(node, toc[i].id)
  })
  return ids
}

const renderLink = ({
  node,
  nodesToJSX,
}: JSXConverterArgs<SerializedLinkNode | SerializedAutoLinkNode>) => {
  const url = node.fields.url ?? ''
  const isExternal = EXTERNAL_URL.test(url)
  return (
    <a
      href={url}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      target={isExternal ? '_blank' : undefined}
    >
      {nodesToJSX({ nodes: node.children })}
    </a>
  )
}

/** Legal document body: heading anchors, scrollable tables, external links in a new tab. */
export const LegalArticle: React.FC<Props> = ({ content, toc, lang, children }) => {
  const ids = headingIds(content, toc)

  const overrides: JSXConverters = {
    heading: ({ node, nodesToJSX }) => {
      const Tag = (HEADING_TAGS.has(node.tag) ? node.tag : 'h2') as 'h2'
      return (
        <Tag className="scroll-mt-28" id={ids.get(node)}>
          {nodesToJSX({ nodes: node.children })}
        </Tag>
      )
    },
    link: renderLink,
    autolink: renderLink,
    table: ({ node, nodesToJSX }) => (
      <div className="not-prose my-6 overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <tbody>{nodesToJSX({ nodes: node.children })}</tbody>
        </table>
      </div>
    ),
    tablecell: ({ node, nodesToJSX }) => {
      const Tag = (node.headerState ?? 0) > 0 ? 'th' : 'td'
      return (
        <Tag
          className="border border-border px-3 py-2 align-top text-text-secondary [&:is(th)]:bg-surface-2 [&:is(th)]:font-semibold [&:is(th)]:text-foreground"
          colSpan={node.colSpan && node.colSpan > 1 ? node.colSpan : undefined}
          rowSpan={node.rowSpan && node.rowSpan > 1 ? node.rowSpan : undefined}
        >
          {nodesToJSX({ nodes: node.children })}
        </Tag>
      )
    },
  }

  return (
    <article className="min-w-0" lang={lang}>
      <RichText
        className="prose-headings:font-display prose-headings:text-foreground prose-p:text-text-secondary prose-li:text-text-secondary prose-strong:text-foreground prose-a:text-primary text-[15px] lg:text-base"
        converterOverrides={overrides}
        data={content}
        enableGutter={false}
      />
      {children}
    </article>
  )
}
