import { describe, expect, it } from 'vitest'

import {
  MARKDOWN_MAX_BYTES,
  extractMarkdownTitle,
  hasMarkdownContent,
  isAllowedMarkdownFile,
  isValidDocSlug,
  markdownByteLength,
  validateMarkdown,
} from '@/utilities/legal/validation'

describe('legal markdown validation', () => {
  it('validateMarkdown handles required/empty', () => {
    expect(typeof validateMarkdown('', { required: true })).toBe('string')
    expect(typeof validateMarkdown(null, { required: true })).toBe('string')
    expect(validateMarkdown('', { required: false })).toBe(true)
    expect(validateMarkdown(undefined, { required: false })).toBe(true)
  })

  it('enforces the byte limit boundary', () => {
    expect(validateMarkdown('a'.repeat(MARKDOWN_MAX_BYTES), { required: true })).toBe(true)
    expect(typeof validateMarkdown('a'.repeat(MARKDOWN_MAX_BYTES + 1), { required: true })).toBe(
      'string',
    )
  })

  it('counts bytes, not characters', () => {
    expect(markdownByteLength('é')).toBe(2)
    expect(
      typeof validateMarkdown('é'.repeat(MARKDOWN_MAX_BYTES / 2 + 1), { required: true }),
    ).toBe('string')
  })

  it('rejects replacement characters', () => {
    expect(typeof validateMarkdown('x\uFFFDy', { required: true })).toBe('string')
  })

  it('extractMarkdownTitle', () => {
    expect(extractMarkdownTitle('intro\n# Privacy Policy \n## A')).toBe('Privacy Policy')
    expect(extractMarkdownTitle('## A')).toBeNull()
    expect(extractMarkdownTitle('#NoSpace')).toBeNull()
  })

  it('hasMarkdownContent', () => {
    expect(hasMarkdownContent('  \n')).toBe(false)
    expect(hasMarkdownContent(null)).toBe(false)
    expect(hasMarkdownContent('# a')).toBe(true)
  })

  it('isAllowedMarkdownFile', () => {
    expect(isAllowedMarkdownFile('a.MD', 10)).toBe(true)
    expect(isAllowedMarkdownFile('a.markdown', 10)).toBe(true)
    expect(typeof isAllowedMarkdownFile('a.docx', 10)).toBe('string')
    expect(typeof isAllowedMarkdownFile('a.md', 0)).toBe('string')
    expect(typeof isAllowedMarkdownFile('a.md', MARKDOWN_MAX_BYTES + 1)).toBe('string')
  })

  it('isValidDocSlug reuses the app slug rule', () => {
    expect(isValidDocSlug('privacy-policy')).toBe(true)
    expect(isValidDocSlug('Privacy')).toBe(false)
  })
})
