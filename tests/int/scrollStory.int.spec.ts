import { describe, expect, it } from 'vitest'

import { PIN_QUERY, phoneSlot, STORY_QUERY } from '@/components/home/scrollStoryConfig'

describe('phoneSlot', () => {
  it('centres a single phone whatever its index', () => {
    expect(phoneSlot(1, 0)).toBe('center')
    expect(phoneSlot(0, 0)).toBe('center')
  })

  it('follows stage position for 2 and 3 phones (left, centre, right)', () => {
    expect([0, 1].map((i) => phoneSlot(2, i))).toEqual(['left', 'center'])
    expect([0, 1, 2].map((i) => phoneSlot(3, i))).toEqual(['left', 'center', 'right'])
  })

  it('falls back to centre for an out-of-range index', () => {
    expect(phoneSlot(3, 7)).toBe('center')
  })
})

describe('story media queries', () => {
  it('only targets desktop pointers without reduced motion; pinning also needs height + JS', () => {
    expect(STORY_QUERY).toContain('(min-width: 1024px)')
    expect(STORY_QUERY).toContain('(pointer: fine)')
    expect(STORY_QUERY).toContain('(prefers-reduced-motion: no-preference)')
    expect(PIN_QUERY.startsWith(STORY_QUERY)).toBe(true)
    expect(PIN_QUERY).toContain('(min-height: 760px)')
    expect(PIN_QUERY).toContain('(scripting: enabled)')
  })
})
