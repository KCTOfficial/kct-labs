import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'
import { ValidationError } from 'payload'

import type { AppDocument } from '@/payload-types'
import { markdownToLexical } from '@/utilities/legal/lexical'
import { hasMarkdownContent, validateMarkdown } from '@/utilities/legal/validation'

type LocalizedValue<T> = Record<string, T | null | undefined>

const toContent = async (markdown: string | null | undefined, req: PayloadRequest) => {
  if (!hasMarkdownContent(markdown)) return null
  // Drafts skip field validation, so the size/encoding limits are enforced here as well.
  const result = validateMarkdown(markdown, { required: false })
  if (result !== true) {
    throw new ValidationError({
      collection: 'app-documents',
      errors: [{ message: result, path: 'markdown' }],
      req,
    })
  }
  try {
    return await markdownToLexical(markdown as string, req.payload.config)
  } catch (error) {
    req.payload.logger.error({ err: error, msg: 'Markdown conversion failed' })
    throw new ValidationError({
      collection: 'app-documents',
      errors: [{ message: 'Markdown could not be converted. Check its syntax.', path: 'markdown' }],
      req,
    })
  }
}

/** `markdown` is the source of truth; `content` is regenerated only for locales whose markdown changed. */
export const convertMarkdown: CollectionBeforeChangeHook<AppDocument> = async ({
  data,
  originalDoc,
  req,
}) => {
  if (data.markdown === undefined) return data

  if (req.locale === 'all') {
    const markdown = (data.markdown ?? {}) as unknown as LocalizedValue<string>
    const previous = (originalDoc?.markdown ?? {}) as unknown as LocalizedValue<string>
    const content = { ...((data.content ?? {}) as unknown as LocalizedValue<unknown>) }
    for (const [locale, value] of Object.entries(markdown)) {
      if (value !== previous[locale] || !content[locale]) {
        content[locale] = await toContent(value, req)
      }
    }
    data.content = content as unknown as AppDocument['content']
    return data
  }

  if (data.markdown !== originalDoc?.markdown || !originalDoc?.content) {
    data.content = (await toContent(data.markdown, req)) as AppDocument['content']
  }
  return data
}
