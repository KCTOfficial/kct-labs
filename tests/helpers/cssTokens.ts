import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Reads design tokens straight from globals.css so tests fail when a token drifts. */
export const css = readFileSync(
  path.resolve(process.cwd(), 'src/app/(frontend)/globals.css'),
  'utf8',
)

export type Tokens = Record<string, string>

/** Body of the first rule at/after `from` whose selector starts with `selector` (no nested braces). */
export const block = (selector: string, from = 0): string => {
  const start = css.indexOf(selector, from)
  if (start < 0) throw new Error(`selector not found: ${selector}`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

export const parseTokens = (body: string): Tokens => {
  const tokens: Tokens = {}
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim()
  return tokens
}

export const light = parseTokens(block(':root {'))
export const dark = parseTokens(block("[data-theme='dark'] {"))
export const media = parseTokens(
  block(':root:not([data-theme])', css.indexOf('@media (prefers-color-scheme: dark)')),
)

/** Resolves a token (following one `var()` hop) to a solid #rrggbb, falling back to the light base. */
export const tok = (theme: Tokens, name: string): string => {
  const merged = { ...light, ...theme }
  let value = merged[name]
  const ref = /^var\((--[\w-]+)\)$/.exec(value ?? '')
  if (ref) value = merged[ref[1]]
  if (!value || !/^#[0-9a-f]{6}$/i.test(value))
    throw new Error(`${name} is not a solid hex: ${value}`)
  return value
}

const channel = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  )
}

/** WCAG 2.x contrast ratio between two solid `#rrggbb` colours. */
export const contrast = (fgHex: string, bgHex: string): number => {
  const [a, b] = [luminance(fgHex), luminance(bgHex)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}
