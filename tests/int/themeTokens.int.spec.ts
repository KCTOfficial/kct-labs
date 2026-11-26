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
const media = parseTokens(
  block(':root:not([data-theme])', css.indexOf('@media (prefers-color-scheme: dark)')),
)

/** Resolves a token (following one `var()` hop) to a solid #rrggbb, falling back to the light base. */
const tok = (theme: Tokens, name: string): string => {
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
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  )
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
    expect(contrast(tok(t, '--primary-foreground'), tok(t, '--primary'))).toBeGreaterThanOrEqual(
      4.5,
    )
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

  describe('hero progress indicator (WCAG 1.4.11, UI >= 3:1)', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/components/home/HeroProgress.tsx'),
      'utf8',
    )
    // Colour tokens used by the track span (unfilled track + inactive dots, incl. hover state).
    const trackClasses = /'relative block h-1\.5[^']*'[\s\S]*?\)/.exec(source)?.[0] ?? ''
    const tokens = [...trackClasses.matchAll(/\bbg-([a-z0-9-]+)/g)].map((m) => `--${m[1]}`)
    const allThemes: [string, Tokens][] = [...themes, ['prefers-color-scheme dark', media]]

    it('reads the track colours from HeroProgress', () => {
      expect(tokens.length).toBeGreaterThanOrEqual(2) // base + hover
    })

    it.each(allThemes)('%s: track/dot colours on background and surface >= 3', (_n, t) => {
      for (const n of tokens) {
        for (const bg of ['--background', '--surface']) {
          expect(contrast(tok(t, n), tok(t, bg)), `${n} on ${bg}`).toBeGreaterThanOrEqual(3)
        }
      }
    })
  })

  it.each([...themes, ['prefers-color-scheme dark', media] as [string, Tokens]])(
    '%s: text-muted on surface-2 >= 4.5',
    (_n, t) => {
      expect(contrast(tok(t, '--text-muted'), tok(t, '--surface-2'))).toBeGreaterThanOrEqual(4.5)
    },
  )

  describe('text on navy-tinted backgrounds (service card, hero stats glow)', () => {
    type Rgb = [number, number, number]
    const rgb = (hex: string): Rgb => {
      const n = parseInt(hex.slice(1), 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const toHex = (c: number[]) =>
      `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
    /** `color-mix(in srgb, var(--x) N%, transparent)` → [token, alpha]. */
    const tint = (theme: Tokens, name: string): [string, number] => {
      const value = { ...light, ...theme }[name] ?? ''
      const m = /^color-mix\(in srgb, var\((--[\w-]+)\) ([\d.]+)%, transparent\)$/.exec(value)
      if (!m) throw new Error(`${name} is not a color-mix tint: ${value}`)
      return [m[1], Number(m[2]) / 100]
    }
    /** Source-over composite of premultiplied colour + alpha onto a solid backdrop. */
    const over = (premul: number[], alpha: number, backdrop: string) =>
      toHex(rgb(backdrop).map((b, i) => premul[i] + b * (1 - alpha)))

    const source = (file: string) =>
      readFileSync(path.resolve(process.cwd(), `src/components/home/${file}`), 'utf8')
    const allThemes: [string, Tokens][] = [...themes, ['prefers-color-scheme dark', media]]

    it('the service card and the hero glow read their navy tint from the tokens', () => {
      expect(source('HomeCatalog.tsx')).toContain('var(--tint-navy-card)')
      expect(source('HomeHero.tsx')).toContain('var(--tint-navy-glow)')
      expect(source('HomeCatalog.tsx')).not.toMatch(/--brand-navy\)_\d+%/)
      expect(source('HomeHero.tsx')).not.toMatch(/--brand-navy\)_\d+%/)
    })

    it('dark keeps the original look (35% card, 33% glow)', () => {
      for (const t of [dark, media]) {
        expect(tint(t, '--tint-navy-card')).toEqual(['--brand-navy', 0.35])
        expect(tint(t, '--tint-navy-glow')).toEqual(['--brand-navy', 0.33])
      }
    })

    it.each(allThemes)('%s: service card text >= 4.5 along the whole gradient', (_n, t) => {
      // linear-gradient(135deg, tint-navy-card, orange 10%) on the page background; gradients
      // interpolate premultiplied colours, so sample the stops and points in between.
      const [navyToken, navyAlpha] = tint(t, '--tint-navy-card')
      const navy = rgb(tok(t, navyToken))
      const orange = rgb(tok(t, '--accent-orange'))
      for (let step = 0; step <= 10; step++) {
        const p = step / 10
        const alpha = navyAlpha * (1 - p) + 0.1 * p
        const premul = navy.map((v, i) => v * navyAlpha * (1 - p) + orange[i]! * 0.1 * p)
        const bg = over(premul, alpha, tok(t, '--background'))
        for (const fg of ['--text-muted', '--text-secondary', '--foreground']) {
          expect(contrast(tok(t, fg), bg), `${fg} on ${bg} at ${p}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    it.each(allThemes)('%s: hero stats label (text-muted) >= 4.5 at the glow centre', (_n, t) => {
      const [navyToken, alpha] = tint(t, '--tint-navy-glow')
      const premul = rgb(tok(t, navyToken)).map((v) => v * alpha)
      const bg = over(premul, alpha, tok(t, '--background'))
      expect(contrast(tok(t, '--text-muted'), bg)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('the prefers-color-scheme block repeats every [data-theme=dark] token with the same value', () => {
    expect(Object.keys(dark).length).toBeGreaterThan(10)
    expect(media).toEqual(dark)
  })
})
