import { isValidSlug } from '@/utilities/apps/appPath'

/** Pure and client-safe: shared by Payload field validators and the admin upload UI. */

export const MARKDOWN_MAX_BYTES = 524_288
export const MARKDOWN_EXTENSIONS = ['.md', '.markdown'] as const

const REPLACEMENT_CHAR = '\uFFFD'
const TITLE_PATTERN = /^# +(.+?)\s*$/m

export const isValidDocSlug = isValidSlug

export const markdownByteLength = (value: string): number => new TextEncoder().encode(value).length

export const hasMarkdownContent = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0

/** Returns `true` when valid, otherwise an English error message. */
export const validateMarkdown = (
  value: string | null | undefined,
  { required }: { required: boolean },
): true | string => {
  if (!hasMarkdownContent(value)) return required ? 'Markdown content is required.' : true
  const text = value as string
  if (markdownByteLength(text) > MARKDOWN_MAX_BYTES) {
    return `Markdown is too large (max ${MARKDOWN_MAX_BYTES / 1024} KB).`
  }
  if (text.includes(REPLACEMENT_CHAR)) {
    return 'Markdown contains invalid characters; save the file as UTF-8.'
  }
  return true
}

/** Text of the first level-1 heading (`# Title`), trimmed, or `null`. */
export const extractMarkdownTitle = (value: string): string | null => {
  const match = TITLE_PATTERN.exec(value)
  return match ? match[1].trim() : null
}

export const isAllowedMarkdownFile = (name: string, size: number): true | string => {
  const lower = name.toLowerCase()
  if (!MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return 'Only .md or .markdown files are allowed.'
  }
  if (size <= 0) return 'The file is empty.'
  if (size > MARKDOWN_MAX_BYTES) {
    return `File is too large (max ${MARKDOWN_MAX_BYTES / 1024} KB).`
  }
  return true
}
