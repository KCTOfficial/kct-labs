import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { AppDetailHero } from '@/components/apps/detail/AppDetailHero'
import { AppHighlightStrip } from '@/components/apps/detail/AppHighlightStrip'
import { DataControlBanner } from '@/components/apps/detail/DataControlBanner'
import { HowItWorksSection } from '@/components/apps/detail/HowItWorksSection'
import { KeyFeaturesSection } from '@/components/apps/detail/KeyFeaturesSection'
import { LegalLinksRow } from '@/components/apps/detail/LegalLinksRow'
import { RelatedAppRow } from '@/components/apps/detail/RelatedAppRow'
import { en } from '@/i18n/dictionaries/en'
import { id } from '@/i18n/dictionaries/id'

afterEach(cleanup)

const dict = en as never
const longWord = 'x'.repeat(200)
const shot = (n: number) => ({ src: `/s${n}.png`, width: 540, height: 960, alt: `Shot ${n}` })

/** `*.int.spec.ts` files cannot contain JSX: build elements by hand. */
const mount = <P extends object>(component: React.ComponentType<P>, props: P) =>
  render(React.createElement(component as React.ComponentType<object>, props))

describe('AppHighlightStrip', () => {
  it('renders nothing without highlights (the header already shows icon and name)', () => {
    const { container } = mount(AppHighlightStrip, {
      categoryTitle: 'Finance',
      highlights: [],
      icon: null,
      name: 'Jejak Uang',
    })
    expect(container.querySelector('[data-section="highlights"]')).toBeNull()
  })

  it('renders the app block and each highlight with its icon, title and description', () => {
    const { container } = mount(AppHighlightStrip, {
      categoryTitle: 'Finance',
      highlights: [
        { icon: 'zap', title: 'Offline ready', description: 'No internet needed' },
        { icon: null, title: 'No icon', description: null },
      ],
      icon: null,
      name: 'Jejak Uang',
    })
    const root = container.querySelector('[data-section="highlights"]')!
    expect(root.textContent).toContain('Jejak Uang')
    expect(root.textContent).toContain('Finance')
    expect(root.querySelectorAll('li')).toHaveLength(2)
    expect(root.querySelector('[data-icon="zap"]')).not.toBeNull()
    expect(root.querySelector('[data-icon="sparkles"]')).not.toBeNull() // missing icon → fallback glyph
  })

  it('keeps very long text inside its cell', () => {
    const { container } = mount(AppHighlightStrip, {
      categoryTitle: null,
      highlights: [{ icon: 'zap', title: longWord, description: longWord }],
      icon: null,
      name: 'X',
    })
    expect(container.innerHTML).toContain('break-words')
  })
})

describe('HowItWorksSection', () => {
  const data = {
    title: 'Simple steps',
    description: 'Start in a few taps.',
    steps: [
      { title: 'Record', description: 'Add a transaction.', image: shot(1) },
      { title: 'Track', description: null, image: null },
    ],
  }

  it('renders an h2, numbered steps and the explore link to #features', () => {
    const { container } = mount(HowItWorksSection, { data, dict, featuresHref: '#features' })
    const root = container.querySelector('[data-section="how-it-works"]')!
    expect(root.querySelector('h2')?.textContent).toBe('Simple steps')
    expect(root.querySelectorAll('ol > li')).toHaveLength(2)
    expect(root.textContent).toContain('Step 1')
    expect(root.querySelector('a[href="#features"]')?.textContent).toContain(
      en.detail.exploreFeatures,
    )
    expect(root.querySelectorAll('img')).toHaveLength(1) // step without image renders no <img>
  })

  it('the explore button is a pill outlined with the accent, like the install button', () => {
    const { container } = mount(HowItWorksSection, { data, dict, featuresHref: '#features' })
    const button = container.querySelector('a[href="#features"]')!
    expect(button.className).toContain('rounded-full')
    expect(button.className).not.toContain('rounded-[12px]')
    expect(button.className).toContain('border-app-accent')
    expect(button.querySelector('svg.lucide-arrow-right')?.getAttribute('class')).toContain(
      'text-app-accent-text',
    )
  })

  it('hides the explore link when the app has no key features, and falls back to the default heading', () => {
    const { container } = mount(HowItWorksSection, {
      data: { ...data, title: null, description: null },
      dict,
      featuresHref: null,
    })
    expect(container.querySelector('a[href="#features"]')).toBeNull()
    expect(container.querySelector('h2')?.textContent).toBe(en.detail.howItWorks)
  })

  it('renders nothing without data', () => {
    const { container } = mount(HowItWorksSection, { data: null, dict, featuresHref: null })
    expect(container.querySelector('[data-section]')).toBeNull()
  })
})

describe('KeyFeaturesSection', () => {
  it('renders the h2#features, uses a check icon for features without an icon and keeps every label', () => {
    const { container } = mount(KeyFeaturesSection, {
      dict,
      features: [
        { icon: 'wallet', label: 'Budget planning', description: 'Set and track budgets' },
        { icon: null, label: 'Plain feature', description: null },
      ],
      intro: { title: null, description: null },
    })
    const root = container.querySelector('[data-section="features"]')!
    const heading = root.querySelector('h2')!
    expect(heading.id).toBe('features')
    expect(heading.textContent).toBe(en.detail.keyFeatures) // default heading
    expect(root.querySelector('[data-icon="wallet"]')).not.toBeNull()
    expect(root.querySelector('[data-icon="check"]')).not.toBeNull()
    expect(root.textContent).toContain('Budget planning')
    expect(root.textContent).toContain('Plain feature')
  })

  it('uses the custom heading and intro when set', () => {
    const { container } = mount(KeyFeaturesSection, {
      dict,
      features: [{ icon: null, label: 'A', description: null }],
      intro: { title: 'Everything you need', description: 'From recording to reports.' },
    })
    expect(container.querySelector('h2')?.textContent).toBe('Everything you need')
    expect(container.textContent).toContain('From recording to reports.')
  })

  it('renders nothing without features', () => {
    const { container } = mount(KeyFeaturesSection, {
      dict,
      features: [],
      intro: { title: 'Ignored', description: null },
    })
    expect(container.querySelector('[data-section]')).toBeNull()
  })

  it('keeps unbroken long labels inside the card', () => {
    const { container } = mount(KeyFeaturesSection, {
      dict,
      features: [{ icon: null, label: longWord, description: longWord }],
      intro: { title: null, description: null },
    })
    expect(container.innerHTML).toContain('break-words')
  })
})

describe('DataControlBanner', () => {
  it('renders title, text and the legal link when there is one', () => {
    const { container } = mount(DataControlBanner, {
      data: { title: 'Your data, your control', description: 'Stored on your device.' },
      dict,
      learnMoreHref: '/apps/x/legal',
    })
    const root = container.querySelector('[data-section="data-control"]')!
    expect(root.querySelector('h2')?.textContent).toBe('Your data, your control')
    expect(root.querySelector('a[href="/apps/x/legal"]')?.textContent).toContain(
      en.detail.learnMore,
    )
  })

  it('draws the accent motif behind the banner (decorative)', () => {
    const { container } = mount(DataControlBanner, {
      data: { title: 'T', description: 'D' },
      dict,
      learnMoreHref: null,
    })
    const motif = container.querySelector('[data-motif="banner"]')!
    expect(motif.getAttribute('aria-hidden')).toBe('true')
    expect(motif.className).toContain('accent-motif-banner')
  })

  it('has no link without legal documents, and renders nothing without data', () => {
    const { container } = mount(DataControlBanner, {
      data: { title: 'T', description: 'D' },
      dict,
      learnMoreHref: null,
    })
    expect(container.querySelector('a')).toBeNull()
    cleanup()
    const empty = mount(DataControlBanner, { data: null, dict, learnMoreHref: null })
    expect(empty.container.querySelector('[data-section]')).toBeNull()
  })
})

describe('RelatedAppRow', () => {
  const app = {
    id: 5,
    name: 'AksaraGo',
    slug: 'aksarago',
    shortDescription: 'Learn numeracy',
    icon: null,
    category: { id: 1, title: 'Education', slug: 'education' },
    status: 'live',
    downloadsLabel: null,
  } as never

  it('has one named link to the app page that can open the quick view', () => {
    const { container } = mount(RelatedAppRow, { app, dict, locale: 'en' as const })
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]!.getAttribute('href')).toBe('/en/apps/aksarago')
    expect(links[0]!.hasAttribute('data-quick-view')).toBe(true)
    expect(links[0]!.textContent).toContain('AksaraGo')
    expect(container.textContent).toContain('Education')
  })

  it('uses the unprefixed URL for the default locale', () => {
    const { container } = mount(RelatedAppRow, { app, dict, locale: 'id' as const })
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/apps/aksarago')
  })
})

describe('AppDetailHero (matches design/app-detail.png: no share button, no spec row)', () => {
  const base = {
    name: 'Jejak Uang',
    tagline: 'Manage your daily finances',
    icon: null,
    playStoreUrl: 'https://play.google.com/store/apps/details?id=id.jejakuang.app' as string | null,
    chipLabel: 'Finance app',
    breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Jejak Uang' }],
    breadcrumbLabel: 'Breadcrumb',
    backHref: '/apps',
    backLabel: 'All apps',
    installLabel: 'Get it on Google Play',
    phones: [] as Array<{ slot: 'left' | 'center' | 'right'; image: ReturnType<typeof shot> }>,
  }

  it('renders exactly one h1 with the app name, the category chip, the tagline and the install link', () => {
    const { container } = mount(AppDetailHero, base)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('h1')?.textContent).toBe('Jejak Uang')
    expect(container.querySelector('[data-hero-chip]')?.textContent).toBe('Finance app')
    expect(container.textContent).toContain('Manage your daily finances')
    expect(container.querySelector(`a[href="${base.playStoreUrl}"]`)).not.toBeNull()
  })

  it('install button: a pill, outlined with the accent, Google Play mark and an accent-coloured arrow', () => {
    const { container } = mount(AppDetailHero, base)
    const button = container.querySelector(`a[href="${base.playStoreUrl}"]`)!
    expect(button.className).toContain('rounded-full')
    expect(button.className).not.toContain('rounded-[12px]')
    expect(button.className).toContain('border-app-accent')
    expect(button.querySelector('[data-google-play]')).not.toBeNull()
    const arrow = button.querySelector('svg.lucide-arrow-up-right')!
    expect(arrow.getAttribute('class')).toContain('text-app-accent-text')
  })

  it('draws the accent motif behind the hero (decorative, with or without a chosen accent)', () => {
    const { container } = mount(AppDetailHero, base)
    const motif = container.querySelector('[data-motif="hero"]')!
    expect(motif.getAttribute('aria-hidden')).toBe('true')
    expect(motif.className).toContain('accent-motif-hero')
  })

  it('has no spec row (dl) and no share button any more', () => {
    const { container } = mount(AppDetailHero, base)
    expect(container.querySelector('dl')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })

  it('renders no phones without screenshots, and decorative phone images (empty alt) with them', () => {
    expect(mount(AppDetailHero, base).container.querySelector('[data-hero-phones]')).toBeNull()
    cleanup()
    const { container } = mount(AppDetailHero, {
      ...base,
      phones: [
        { slot: 'left', image: shot(2) },
        { slot: 'center', image: shot(1) },
        { slot: 'right', image: shot(3) },
      ],
    })
    const phones = container.querySelector('[data-hero-phones]')!
    expect(phones.querySelectorAll('img')).toHaveLength(3)
    for (const img of phones.querySelectorAll('img')) expect(img.getAttribute('alt')).toBe('')
  })

  it('omits the install link when the app has no Play Store URL, and the chip without a category', () => {
    const { container } = mount(AppDetailHero, { ...base, playStoreUrl: null, chipLabel: null })
    expect(container.querySelector('a[href*="play.google.com"]')).toBeNull()
    expect(container.querySelector('[data-hero-chip]')).toBeNull()
  })
})

describe('LegalLinksRow', () => {
  const docs = [
    { href: '/apps/x/legal/privacy-policy', title: 'Privacy Policy', icon: 'shield-check' },
    { href: '/apps/x/legal/terms', title: 'Terms', icon: 'scroll-text' },
  ]

  it('renders nothing without documents, legacy link or support email', () => {
    const { container } = mount(LegalLinksRow, {
      dict,
      docs: [],
      legacyPrivacyUrl: null,
      allDocsHref: null,
      supportEmail: null,
    })
    expect(container.firstChild).toBeNull()
  })

  it('lists the documents as internal links plus the index link', () => {
    const { container } = mount(LegalLinksRow, {
      dict,
      docs,
      legacyPrivacyUrl: null,
      allDocsHref: '/apps/x/legal',
      supportEmail: null,
    })
    const links = [...container.querySelectorAll('[data-legal-links] a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/apps/x/legal/privacy-policy',
      '/apps/x/legal/terms',
      '/apps/x/legal',
    ])
    expect(links.at(-1)?.textContent).toContain(en.legal.allDocuments)
    expect(links.some((a) => a.hasAttribute('target'))).toBe(false)
  })

  it('keeps the legacy external privacy link (new tab, noopener) and the support email', () => {
    const { container } = mount(LegalLinksRow, {
      dict,
      docs: [],
      legacyPrivacyUrl: 'https://example.com/privacy',
      allDocsHref: null,
      supportEmail: 'support@example.com',
    })
    const legacy = container.querySelector('[data-legal-links] a')!
    expect(legacy.getAttribute('href')).toBe('https://example.com/privacy')
    expect(legacy.getAttribute('target')).toBe('_blank')
    expect(legacy.getAttribute('rel')).toBe('noopener noreferrer')
    expect(container.querySelector('a[href="mailto:support@example.com"]')).not.toBeNull()
  })
})

describe('dictionary', () => {
  it('has the new detail strings in both languages', () => {
    for (const d of [en, id]) {
      for (const key of [
        'howItWorks',
        'exploreFeatures',
        'learnMore',
        'stepNumber',
        'categoryApp',
      ] as const) {
        expect(d.detail[key], key).toBeTruthy()
      }
      expect(d.detail.stepNumber).toContain('{n}')
      expect(d.detail.categoryApp).toContain('{category}')
    }
  })
})
