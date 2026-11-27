import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { HowItWorksSection } from '@/components/apps/detail/HowItWorksSection'
import { PhoneFrame } from '@/components/site/PhoneFrame'
import { en } from '@/i18n/dictionaries/en'

afterEach(cleanup)

const shot = (n: number) => ({ src: `/s${n}.png`, width: 540, height: 960, alt: `Shot ${n}` })

const mount = <P extends object>(component: React.ComponentType<P>, props: P) =>
  render(React.createElement(component as React.ComponentType<object>, props))

/**
 * Regression: a fixed 38px radius / 8px bezel made small phones look like toys. The geometry must
 * stay a share of the frame so it scales with the width (design: 260px → 38px / 8px / 30px).
 */
describe('PhoneFrame geometry', () => {
  const frame = () => {
    const { container } = mount(PhoneFrame, { image: shot(1), sizes: '200px' })
    return {
      outer: container.querySelector<HTMLElement>('[data-phone-frame]')!,
      screen: container.querySelector<HTMLElement>('[data-phone-screen]')!,
    }
  }

  it('uses percentage radii and bezel, never fixed pixels', () => {
    const { outer, screen } = frame()
    expect(outer.className).toContain('rounded-[14.6%/7.04%]')
    expect(screen.className).toContain('rounded-[12.3%/5.7%]')
    expect(screen.className).toContain('inset-x-[3.08%]')
    expect(screen.className).toContain('inset-y-[1.48%]')
    for (const el of [outer, screen]) {
      expect(el.className).not.toMatch(/rounded-\[\d+px\]/)
    }
    expect(outer.className).not.toMatch(/(^|\s)p-\d/) // bezel is no longer fixed padding
  })

  it('keeps the design ratio and the screen image', () => {
    const { outer, screen } = frame()
    expect(outer.className).toContain('aspect-[260/540]')
    expect(screen.querySelector('img')?.getAttribute('alt')).toBe('Shot 1')
  })

  it('renders the camera pill only on request, hidden from assistive tech', () => {
    expect(frame().outer.querySelector('[data-phone-notch]')).toBeNull()
    const { container } = mount(PhoneFrame, { image: null, notch: true, sizes: '1px' })
    const notch = container.querySelector('[data-phone-notch]')!
    expect(notch.getAttribute('aria-hidden')).toBe('true')
    expect(notch.className).toContain('w-[27%]')
  })

  it('renders an empty screen without an image and keeps custom screens', () => {
    const empty = mount(PhoneFrame, { image: null, sizes: '1px' })
    expect(empty.container.querySelector('[data-phone-screen] img')).toBeNull()
    cleanup()
    const custom = mount(PhoneFrame, {
      image: null,
      screen: React.createElement('i', { 'data-custom': '' }),
      sizes: '1px',
    })
    expect(custom.container.querySelector('[data-phone-screen] [data-custom]')).not.toBeNull()
  })

  it('lets the caller override the shadow (How it works uses a small one)', () => {
    const { container } = mount(PhoneFrame, {
      className: 'shadow-[0_12px_24px_rgba(0,0,0,0.35)]',
      image: null,
      sizes: '1px',
    })
    const cls = container.querySelector('[data-phone-frame]')!.className
    expect(cls).toContain('shadow-[0_12px_24px_rgba(0,0,0,0.35)]')
    expect(cls).not.toContain('shadow-[0_30px_60px')
  })
})

describe('How it works phones', () => {
  const data = {
    title: 'Simple steps',
    description: null,
    steps: [
      { title: 'One', description: 'a', image: shot(1) },
      { title: 'Two', description: null, image: shot(2) },
      { title: 'Three', description: 'c', image: shot(3) },
      { title: 'Four', description: 'd', image: shot(4) },
      { title: 'No picture', description: null, image: null },
    ],
  }

  it('crops each phone in its own box and leans every one to the left', () => {
    const { container } = mount(HowItWorksSection, {
      data,
      dict: en as never,
      featuresHref: null,
    })
    const boxes = [...container.querySelectorAll('[data-step-phone]')]
    expect(boxes).toHaveLength(4) // the step without image has none
    for (const box of boxes) expect(box.className).toContain('overflow-hidden')
    const tilts = boxes.map(
      (b) => b.querySelector('[data-phone-frame]')!.className.match(/(-?rotate-\d)/)?.[1],
    )
    expect(tilts).toEqual(['-rotate-3', '-rotate-3', '-rotate-3', '-rotate-3'])
    for (const box of boxes) expect(box.querySelector('[data-phone-notch]')).not.toBeNull()
  })

  it('left-aligns text, repeats the number in the title row and keeps the screen-reader label', () => {
    const { container } = mount(HowItWorksSection, {
      data,
      dict: en as never,
      featuresHref: null,
    })
    const first = container.querySelector('ol > li')!
    expect(first.className).toContain('text-left')
    const h3 = first.querySelector('h3')!
    expect(h3.querySelector('[aria-hidden="true"]')?.textContent).toBe('1')
    expect(h3.textContent).toContain('Step 1')
    expect(h3.textContent).toContain('One')
  })

  it('keeps room for the corner badge when a step has no picture', () => {
    const { container } = mount(HowItWorksSection, {
      data,
      dict: en as never,
      featuresHref: null,
    })
    const items = [...container.querySelectorAll('ol > li')]
    expect(items[4]!.className).toContain('pt-14')
    expect(items[0]!.className).not.toContain('pt-14')
  })
})
