import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AccentSwatchGroup } from '@/collections/Apps/components/AccentSwatchGroup'
import { accentColorField } from '@/fields/accentColorField'
import {
  ACCENT_PRESETS,
  accentPresetError,
  accentSwatches,
  isAccentPreset,
  toAccent,
} from '@/utilities/apps/accent'

import {
  contrast,
  css,
  dark,
  light,
  media,
  parseTokens,
  tok,
  type Tokens,
} from '../helpers/cssTokens'

afterEach(cleanup)

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tokens declared by the rule whose selector is exactly `selector` (on its own line). */
const ruleTokens = (selector: string): Tokens => {
  const match = new RegExp(`(^|\\n)[ \\t]*${escapeRegExp(selector)}\\s*\\{`).exec(css)
  if (!match) throw new Error(`rule not found: ${selector}`)
  const open = match.index + match[0].length - 1
  return parseTokens(css.slice(open + 1, css.indexOf('}', open)))
}

const themeRules = (preset: string) => ({
  light: ruleTokens(`[data-accent='${preset}']`),
  dark: ruleTokens(`[data-theme='dark'] [data-accent='${preset}']`),
  'prefers-color-scheme dark': ruleTokens(`:root:not([data-theme]) [data-accent='${preset}']`),
})

const backgrounds: Record<string, Tokens> = {
  light,
  dark,
  'prefers-color-scheme dark': media,
}

describe('accent presets', () => {
  it('offers the 12 documented presets', () => {
    expect([...ACCENT_PRESETS]).toEqual([
      'blue',
      'sky',
      'cyan',
      'teal',
      'green',
      'lime',
      'amber',
      'orange',
      'red',
      'rose',
      'pink',
      'purple',
    ])
  })

  it('falls back to the brand colours when no preset is set', () => {
    expect(css).toMatch(/--app-accent:\s*var\(--primary\)/)
    expect(css).toMatch(/--app-accent-text:\s*var\(--primary\)/)
  })

  it('defines the soft tint at :root too, so apps WITHOUT an accent still get tinted tiles', () => {
    // `bg-app-accent-soft` on an app without data-accent would resolve to nothing (transparent).
    expect(css).toMatch(
      /:root\s*\{[^}]*--app-accent-soft:\s*color-mix\(in srgb, var\(--app-accent\) \d+%, transparent\)/,
    )
  })

  it('derives the soft tint from the accent itself', () => {
    expect(ruleTokens('[data-accent]')['--app-accent-soft']).toMatch(
      /^color-mix\(in srgb, var\(--app-accent\) \d+%, transparent\)$/,
    )
  })

  describe.each(ACCENT_PRESETS.map((preset) => [preset]))('%s', (preset) => {
    const rules = themeRules(preset)

    it.each(Object.entries(rules))(
      '%s: text accent >= 4.5 and fill accent >= 3 on every surface',
      (theme, tokens) => {
        const base = backgrounds[theme]!
        for (const bg of ['--background', '--surface', '--bg-raised']) {
          expect(
            contrast(tokens['--app-accent-text']!, tok(base, bg)),
            `text on ${bg}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
        for (const bg of ['--background', '--surface']) {
          expect(
            contrast(tokens['--app-accent']!, tok(base, bg)),
            `fill on ${bg}`,
          ).toBeGreaterThanOrEqual(3)
        }
      },
    )

    it('keeps the swatches shown in the admin identical to the CSS', () => {
      expect(accentSwatches[preset].light.toLowerCase()).toBe(
        rules.light['--app-accent']!.toLowerCase(),
      )
      expect(accentSwatches[preset].dark.toLowerCase()).toBe(
        rules.dark['--app-accent']!.toLowerCase(),
      )
    })

    it('repeats the dark tokens in the prefers-color-scheme block', () => {
      expect(rules['prefers-color-scheme dark']).toEqual(rules.dark)
    })
  })
})

describe('accent motifs (hero and banner backgrounds, pure CSS)', () => {
  const rule = (name: string): string => {
    const match = new RegExp(`\\.${name}\\s*\\{`).exec(css)
    if (!match) throw new Error(`rule not found: .${name}`)
    const open = match.index + match[0].length - 1
    return css.slice(open + 1, css.indexOf('}', open))
  }

  it.each(['accent-motif-hero', 'accent-motif-banner'])(
    '.%s takes every colour from the accent tokens (no hex, no fixed colour functions)',
    (name) => {
      const body = rule(name)
      expect(body).toContain('var(--app-accent)')
      expect(body).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(body).not.toMatch(/\b(rgb|hsl)a?\(/i)
    },
  )

  it('keeps the tint under text as one shared token', () => {
    expect(css).toMatch(/--motif-wash:\s*\d+%/)
    expect(rule('accent-motif-hero')).toContain('var(--motif-wash)')
    expect(rule('accent-motif-banner')).toContain('var(--motif-wash)')
  })

  /** sRGB mix like `color-mix(in srgb, accent W%, base)`. */
  const mix = (accent: string, base: string, w: number): string => {
    const a = parseInt(accent.slice(1), 16)
    const b = parseInt(base.slice(1), 16)
    const ch = (shift: number) =>
      Math.round(((a >> shift) & 255) * w + ((b >> shift) & 255) * (1 - w))
        .toString(16)
        .padStart(2, '0')
    return `#${ch(16)}${ch(8)}${ch(0)}`
  }
  const wash = Number(/--motif-wash:\s*(\d+)%/.exec(css)?.[1] ?? 100) / 100

  describe.each(ACCENT_PRESETS.map((preset) => [preset]))('%s', (preset) => {
    const rules = themeRules(preset)
    it.each(Object.entries(rules))(
      '%s: body text stays >= 4.5:1 on the background tinted by the wash',
      (theme, tokens) => {
        const base = backgrounds[theme]!
        for (const surface of ['--background', '--surface']) {
          const tinted = mix(tokens['--app-accent']!, tok(base, surface), wash)
          for (const text of ['--foreground', '--text-secondary', '--text-muted']) {
            expect(
              contrast(tok(base, text), tinted),
              `${text} on ${surface}`,
            ).toBeGreaterThanOrEqual(4.5)
          }
        }
      },
    )
  })

  it('the brand fallback (no preset) keeps text readable too', () => {
    for (const [theme, base] of Object.entries(backgrounds)) {
      const tinted = mix(tok(base, '--primary'), tok(base, '--background'), wash)
      for (const text of ['--text-secondary', '--text-muted']) {
        expect(contrast(tok(base, text), tinted), `${theme} ${text}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('accent validation', () => {
  it('accepts presets and treats empty values as "brand"', () => {
    expect(accentPresetError('green')).toBeNull()
    for (const empty of [undefined, null, '']) expect(accentPresetError(empty)).toBeNull()
  })

  it('rejects anything that is not a preset', () => {
    for (const bad of ['#ff0000', 'Green', 'nope', 7, '<script>']) {
      expect(typeof accentPresetError(bad), String(bad)).toBe('string')
    }
  })

  it('toAccent returns a preset or null (never a bad value into the markup)', () => {
    expect(toAccent('purple')).toBe('purple')
    for (const bad of ['', null, undefined, 'nope', '#fff', 3]) expect(toAccent(bad)).toBeNull()
    expect(isAccentPreset('rose')).toBe(true)
    expect(isAccentPreset('Rose')).toBe(false)
  })
})

describe('accentColorField', () => {
  it('is an optional, non-localized text field with the swatch component and a validator', async () => {
    const field = accentColorField()
    expect(field).toMatchObject({ name: 'accentColor', type: 'text', localized: false })
    expect(field.required).toBeFalsy()
    expect(field.admin?.components?.Field).toBe(
      '@/collections/Apps/components/AccentColorField#AccentColorField',
    )
    const validate = field.validate!
    expect(await validate('green' as never, {} as never)).toBe(true)
    expect(await validate('' as never, {} as never)).toBe(true)
    expect(typeof (await validate('#fff' as never, {} as never))).toBe('string')
  })
})

describe('AccentSwatchGroup', () => {
  const mount = (value: string | null) => {
    const onChange = vi.fn()
    render(React.createElement(AccentSwatchGroup, { value, onChange }))
    return onChange
  }

  it('renders a radio per preset plus "Brand (default)"', () => {
    mount(null)
    expect(screen.getAllByRole('radio')).toHaveLength(ACCENT_PRESETS.length + 1)
    expect(screen.getByRole('radiogroup')).toBeTruthy()
  })

  it('checks only the current value ("Brand" when empty)', () => {
    mount('green')
    expect(screen.getByRole('radio', { name: 'Green' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: /Brand/ }).getAttribute('aria-checked')).toBe('false')
    cleanup()
    mount(null)
    expect(screen.getByRole('radio', { name: /Brand/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('reports the chosen preset, and null for "Brand"', () => {
    const onChange = mount('green')
    fireEvent.click(screen.getByRole('radio', { name: 'Purple' }))
    expect(onChange).toHaveBeenLastCalledWith('purple')
    fireEvent.click(screen.getByRole('radio', { name: /Brand/ }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('arrow keys select the next/previous option and wrap around', () => {
    const onChange = mount('blue')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Blue' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('sky')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Blue' }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith(null)
    cleanup()
    const wrap = mount(null)
    fireEvent.keyDown(screen.getByRole('radio', { name: /Brand/ }), { key: 'ArrowLeft' })
    expect(wrap).toHaveBeenLastCalledWith('purple')
  })
})
