import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  HERO_AUTOPLAY_MS,
  HERO_SLIDE_MS,
  HERO_STAGGER_MS,
} from '@/components/home/heroCarouselModel'

/**
 * The carousel's clocks live in CSS (globals.css) while JS commits steps with the same numbers:
 * the fill's animationend IS the autoplay step, and the slide commit waits for the last phone's
 * transition. A drift between the two silently breaks the timing, so pin them together here.
 */
const css = readFileSync(path.resolve(process.cwd(), 'src/app/(frontend)/globals.css'), 'utf8')

/** Body of the first rule whose selector is exactly `selector` (no nested braces). */
const rule = (selector: string): string => {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`selector not found: ${selector}`)
  const open = css.indexOf('{', start)
  return css.slice(open + 1, css.indexOf('}', open))
}

const ms = (body: string, pattern: RegExp): number => {
  const m = pattern.exec(body)
  if (!m) throw new Error(`no match for ${pattern} in: ${body.trim()}`)
  return Number(m[1])
}

describe('hero carousel CSS timing matches heroCarouselModel', () => {
  it('.hero-progress-fill runs for HERO_AUTOPLAY_MS', () => {
    expect(ms(rule('  .hero-progress-fill'), /animation:\s*hero-progress\s+(\d+)ms/)).toBe(
      HERO_AUTOPLAY_MS,
    )
  })

  it('.hero-track slides for HERO_SLIDE_MS', () => {
    expect(ms(rule('.hero-track[data-slide]'), /transition:\s*transform\s+(\d+)ms/)).toBe(
      HERO_SLIDE_MS,
    )
  })

  it('centre and right phones are staggered by one and two HERO_STAGGER_MS', () => {
    const delay = /transition-delay:\s*(\d+)ms/
    expect(ms(rule(".hero-track[data-slide][data-slot='center']"), delay)).toBe(HERO_STAGGER_MS)
    expect(ms(rule(".hero-track[data-slide][data-slot='right']"), delay)).toBe(2 * HERO_STAGGER_MS)
  })
})
