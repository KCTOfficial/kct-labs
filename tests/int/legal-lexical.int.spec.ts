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
    expect(withScript).toHaveLength(1)
    expect(withScript[0]?.type).toBe('text')
    expect(withScript[0]?.text).toContain('<script>alert(1)</script>')
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

  it('extractToc ids stay unique when a slug collides with a suffix', async () => {
    const state = await markdownToLexical('## A\n## A\n## A 2', sanitizedConfig)
    const ids = extractToc(state).map((t) => t.id)
    expect(ids.slice(0, 2)).toEqual(['a', 'a-2'])
    expect(new Set(ids).size).toBe(3)
  })

  it('neutralizes unsafe link urls but keeps safe ones', async () => {
    const state = await markdownToLexical(
      '[x](javascript:alert(1)) [m](mailto:a@b.c) [r](/apps) [h](https://e.x)',
      sanitizedConfig,
    )
    const nodes = flatten(state.root as unknown as AnyNode)
    const urls = nodes
      .filter((n) => n.type === 'link' || n.type === 'autolink')
      .map((n) => n.fields?.url)
    expect(urls.some((u) => /javascript:/i.test(u ?? ''))).toBe(false)
    expect(urls).toEqual(expect.arrayContaining(['mailto:a@b.c', '/apps', 'https://e.x']))
    // Label text survives (as a plain text node, never as a link href).
    expect(nodes.some((n) => n.type === 'text' && (n.text ?? '').includes('x'))).toBe(true)
  })

  it('headingId slugifies text', () => {
    expect(headingId('  Data & Privasi Pengguna! ')).toBe('data-privasi-pengguna')
    expect(headingId('')).toBe('section')
  })
})
