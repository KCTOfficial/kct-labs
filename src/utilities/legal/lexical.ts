import {
  convertMarkdownToLexical,
  editorConfigFactory,
  EXPERIMENTAL_TableFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { SanitizedConfig } from 'payload'

type LegalFeatures = NonNullable<NonNullable<Parameters<typeof lexicalEditor>[0]>['features']>

// Shared so the field editor and the markdown converter always agree on supported nodes.
const legalFeatures: LegalFeatures = ({ defaultFeatures }) => [
  ...defaultFeatures,
  EXPERIMENTAL_TableFeature(),
]

export const legalEditor = lexicalEditor({ features: legalFeatures })

type LexicalNode = { type?: string; tag?: string; text?: string; children?: LexicalNode[] }

const FALLBACK_HEADING_ID = 'section'

const demoteNode = (node: LexicalNode): LexicalNode => {
  const children = node.children?.map(demoteNode)
  const tag = node.type === 'heading' && node.tag === 'h1' ? 'h2' : node.tag
  return {
    ...node,
    ...(tag !== undefined && { tag }),
    ...(children && { children }),
  }
}

/** The page title is the only h1, so any h1 in document content becomes h2. */
export const demoteH1 = (state: SerializedEditorState): SerializedEditorState => ({
  ...state,
  root: demoteNode(
    state.root as unknown as LexicalNode,
  ) as unknown as SerializedEditorState['root'],
})

/**
 * Markdown has no raw-HTML node in this editor config, so tags like `<script>` stay plain text.
 */
export const markdownToLexical = async (
  markdown: string,
  config: SanitizedConfig,
): Promise<SerializedEditorState> => {
  const editorConfig = await editorConfigFactory.fromFeatures({ config, features: legalFeatures })
  const state = convertMarkdownToLexical({ editorConfig, markdown })
  return demoteH1(state as unknown as SerializedEditorState)
}

const nodeText = (node: LexicalNode): string =>
  node.text ?? (node.children ?? []).map(nodeText).join('')

export const headingId = (text: string): string => {
  const slug = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || FALLBACK_HEADING_ID
}

/** Top-level h2 headings with ids made unique in document order (`a`, `a-2`, ...). */
export const extractToc = (state: SerializedEditorState): Array<{ id: string; text: string }> => {
  const seen = new Map<string, number>()
  const root = state.root as unknown as LexicalNode
  return (root.children ?? [])
    .filter((node) => node.type === 'heading' && node.tag === 'h2')
    .map((node) => {
      const text = nodeText(node).trim()
      const base = headingId(text)
      const count = (seen.get(base) ?? 0) + 1
      seen.set(base, count)
      return { id: count === 1 ? base : `${base}-${count}`, text }
    })
}
