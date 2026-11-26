import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const css = readFileSync(path.resolve(process.cwd(), 'src/app/(frontend)/globals.css'), 'utf8')

type Tokens = Record<string, string>

/** Body of the first rule at/after `from` whose selector starts with `selector` (no nested braces). */
const block = (selector: string, from = 0): string => {
  const start = css.indexOf(selector, from)
  if (start < 0) throw new Error(`selector not found: ${selector}`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

const parseTokens = (body: string): Tokens => {
  const tokens: Tokens = {}
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim()
  return tokens
}

const light = parseTokens(block(':root {'))
const dark = parseTokens(block("[data-theme='dark'] {"))
const media = parseTokens(block(':root:not([data-theme])', css.indexOf('@media (prefers-color-scheme: dark)')))

/** Resolves a token (following one `var()` hop) to a solid #rrggbb, falling back to the light base. */
const tok = (theme: Tokens, name: string): string => {
  const merged = { ...light, ...theme }
  let value = merged[name]
  const ref = /^var\((--[\w-]+)\)$/.exec(value ?? '')
  if (ref) value = merged[ref[1]]
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} is not a solid hex: ${value}`)
  return value
}

const channel = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
const contrast = (fgHex: string, bgHex: string): number => {
  const [a, b] = [luminance(fgHex), luminance(bgHex)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

const themes: [string, Tokens][] = [
  ['light', light],
  ['dark', dark],
]

describe('theme tokens (KCT Hub logo palette)', () => {
  it.each(themes)('%s: primary-foreground on primary >= 4.5', (_n, t) => {
    expect(contrast(tok(t, '--primary-foreground'), tok(t, '--primary'))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(themes)('%s: foreground on background >= 4.5', (_n, t) => {
    expect(contrast(tok(t, '--foreground'), tok(t, '--background'))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(themes)('%s: text-secondary and text-muted on background >= 4.5', (_n, t) => {
    for (const n of ['--text-secondary', '--text-muted']) {
      expect(contrast(tok(t, n), tok(t, '--background'))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(tok(t, n), tok(t, '--surface'))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(themes)('%s: accent-orange-text on background and surface >= 4.5', (_n, t) => {
    for (const bg of ['--background', '--surface']) {
      expect(contrast(tok(t, '--accent-orange-text'), tok(t, bg))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each(themes)('%s: accent-orange, primary and ring on background >= 3', (_n, t) => {
    for (const n of ['--accent-orange', '--primary', '--ring']) {
      expect(contrast(tok(t, n), tok(t, '--background'))).toBeGreaterThanOrEqual(3)
    }
  })

  it('light primary is #14213d and dark primary is #cdf228', () => {
    expect(light['--primary'].toLowerCase()).toBe('#14213d')
    expect(dark['--primary'].toLowerCase()).toBe('#cdf228')
  })

  it('exposes the orange tokens to Tailwind', () => {
    expect(css).toContain('--color-accent-orange: var(--accent-orange)')
    expect(css).toContain('--color-accent-orange-text: var(--accent-orange-text)')
  })

  it('the prefers-color-scheme block repeats every [data-theme=dark] token with the same value', () => {
    expect(Object.keys(dark).length).toBeGreaterThan(10)
    expect(media).toEqual(dark)
  })
})
