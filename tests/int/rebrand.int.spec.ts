import { describe, expect, it } from 'vitest'

import { changedTopLevelFields, replaceBrandDeep } from '../../scripts/rebrand/replaceBrand'

describe('replaceBrandDeep', () => {
  it('replaces every whole-word mention, in any casing and with a non-breaking space', () => {
    const result = replaceBrandDeep('KCT Labs — by KCT labs, KCT LABS and KCT Labs')
    expect(result.value).toBe('KCT Hub — by KCT Hub, KCT Hub and KCT Hub')
    expect(result.replacements).toBe(4)
  })

  it('walks nested objects, arrays and Lexical rich text, reporting field paths', () => {
    const doc = {
      id: 1,
      meta: { title: 'KCT Labs — Apps', description: 'Plain' },
      columns: [{ title: 'Apps' }, { title: 'About KCT Labs' }],
      body: { root: { children: [{ type: 'text', text: 'Welcome to KCT Labs' }] } },
    }
    const result = replaceBrandDeep(doc)
    expect(result.replacements).toBe(3)
    expect(result.paths).toEqual(['meta.title', 'columns[1].title', 'body.root.children[0].text'])
    expect(result.value.meta.title).toBe('KCT Hub — Apps')
    expect(result.value.columns[1].title).toBe('About KCT Hub')
    expect(result.value.body.root.children[0].text).toBe('Welcome to KCT Hub')
  })

  it('is copy-on-write: the input is never mutated and untouched branches keep identity', () => {
    const doc = { meta: { title: 'KCT Labs' }, columns: [{ title: 'Apps' }] }
    const result = replaceBrandDeep(doc)
    expect(doc.meta.title).toBe('KCT Labs')
    expect(result.value).not.toBe(doc)
    expect(result.value.columns).toBe(doc.columns)
  })

  it('returns the same reference when nothing matches (idempotent second run)', () => {
    const doc = { meta: { title: 'KCT Hub — Apps' }, tags: ['KCT', 'Labs'] }
    const result = replaceBrandDeep(doc)
    expect(result.value).toBe(doc)
    expect(result.replacements).toBe(0)
  })

  it('never touches identifiers, slugs, URLs or partial words', () => {
    const doc = {
      slug: 'kct labs',
      url: 'https://example.com/KCT Labs',
      filename: 'KCT Labs.png',
      packageId: 'id.co.kct.labs',
      repo: 'kct-labs',
      note: 'KCT Laboratory and KCTLabs',
    }
    expect(replaceBrandDeep(doc).replacements).toBe(0)
  })

  it('leaves non-string values untouched', () => {
    const date = new Date('2026-01-01')
    const doc = { count: 3, active: true, empty: null, missing: undefined, at: date }
    const result = replaceBrandDeep(doc)
    expect(result.value).toBe(doc)
  })
})

describe('changedTopLevelFields', () => {
  it('returns only top-level keys whose value changed', () => {
    const before = { id: 1, meta: { title: 'KCT Labs' }, tagline: 'Same' }
    const { value: after } = replaceBrandDeep(before)
    expect(changedTopLevelFields(before, after)).toEqual({ meta: { title: 'KCT Hub' } })
  })

  it('returns an empty object when nothing changed', () => {
    const doc = { id: 1, tagline: 'KCT Hub' }
    expect(changedTopLevelFields(doc, replaceBrandDeep(doc).value)).toEqual({})
  })
})
