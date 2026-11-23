import { getPayload, type SanitizedConfig } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, expect, it } from 'vitest'

import { demoteH1, extractToc, headingId, markdownToLexical } from '@/utilities/legal/lexical'

type AnyNode = {
  type?: string
  tag?: string
  text?: string
  fields?: { url?: string }
  children?: AnyNode[]
}

const flatten = (node: AnyNode): AnyNode[] => [node, ...(node.children ?? []).flatMap(flatten)]

const MARKDOWN =
  '# T\n\n## A\n\n- x\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n[l](https://e.x)\n\n<script>alert(1)</script>'

let sanitizedConfig: SanitizedConfig

describe('legal lexical conversion', () => {
  beforeAll(async () => {
    const payload = await getPayload({ config: await config })
    sanitizedConfig = payload.config
  })

  it('converts markdown safely: no h1, table, link, no html node', async () => {
    const state = await markdownToLexical(MARKDOWN, sanitizedConfig)
    const nodes = flatten(state.root as unknown as AnyNode)

    expect(nodes.some((n) => n.type === 'heading' && n.tag === 'h1')).toBe(false)
    expect(nodes.some((n) => n.type === 'heading' && n.tag === 'h2')).toBe(true)
    expect(nodes.some((n) => n.type === 'table')).toBe(true)
    expect(nodes.some((n) => n.type === 'link' && n.fields?.url === 'https://e.x')).toBe(true)
    expect(nodes.some((n) => n.type === 'html')).toBe(false)
    const withScript = nodes.filter((n) =>
      JSON.stringify({ ...n, children: undefined }).includes('<script>'),
    )
    expect(withScript.length).toBeGreaterThan(0)
    expect(withScript.every((n) => n.type === 'text')).toBe(true)
  })

  it('demoteH1 is recursive and leaves other headings', () => {
    const state = {
      root: {
        type: 'root',
        children: [
          { type: 'heading', tag: 'h1', children: [] },
          { type: 'quote', children: [{ type: 'heading', tag: 'h1', children: [] }] },
          { type: 'heading', tag: 'h3', children: [] },
        ],
      },
    }
    const out = demoteH1(state as never) as unknown as { root: AnyNode }
    const tags = flatten(out.root)
      .filter((n) => n.type === 'heading')
      .map((n) => n.tag)
    expect(tags).toEqual(['h2', 'h2', 'h3'])
  })

  it('extractToc returns unique h2 ids only', async () => {
    const state = await markdownToLexical('## A\n## A\n### B', sanitizedConfig)
    expect(extractToc(state)).toEqual([
      { id: 'a', text: 'A' },
      { id: 'a-2', text: 'A' },
    ])
  })

  it('headingId slugifies text', () => {
    expect(headingId('  Data & Privasi Pengguna! ')).toBe('data-privasi-pengguna')
    expect(headingId('')).toBe('section')
  })
})
