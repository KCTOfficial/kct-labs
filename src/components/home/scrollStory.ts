/**
 * Home "scroll story" (scroll-scrubbed motion in the spirit of everylastdrop.co.uk).
 *
 * Architecture (see CLAUDE.md → "Hal yang sering keliru"):
 * - Markup stays server-rendered. Elements opt in with `data-story` (section roots) and
 *   `data-story-part` (animated parts). Pinned sections are wrapped in a server-rendered
 *   `[data-story-track]` with a `.story-spacer`; CSS makes the section sticky — GSAP's own `pin` is
 *   NOT used (it would shift layout after load = CLS, and move React-owned nodes into a wrapper).
 * - GSAP only scrubs `transform`/`opacity`, desktop only. Mobile/tablet keep the CSS `.reveal`.
 *
 * Loaded lazily with GSAP (desktop only). Constants/helpers live in scrollStoryConfig.ts.
 */
import type { gsap as GsapNamespace } from 'gsap'

type Gsap = typeof GsapNamespace

export type BuildOptions = {
  /** Sticky track + spacer are active (desktop, tall enough viewport). */
  pinned: boolean
  /** Height of the sticky site header (pinned sections stick right below it). */
  headerOffset: () => number
}

type Root = HTMLElement

const part = (scope: ParentNode, name: string) =>
  scope.querySelector<HTMLElement>(`[data-story-part="${name}"]`)
const parts = (scope: ParentNode, name: string) => [
  ...scope.querySelectorAll<HTMLElement>(`[data-story-part="${name}"]`),
]

/** Track + spacer of a pinned section, only when the spacer is actually laid out (CSS gate). */
const trackOf = (section: HTMLElement, pinned: boolean) => {
  const track = section.closest<HTMLElement>('[data-story-track]')
  const spacer = track?.querySelector<HTMLElement>('.story-spacer')
  return pinned && track && spacer && spacer.offsetHeight > 0 ? { track, spacer } : null
}

/** Featured: phones/orbits enter from the sides, then (pinned) features light up one by one. */
export const buildFeatured = (gsap: Gsap, root: Root, { pinned, headerOffset }: BuildOptions) => {
  const section = root.querySelector<HTMLElement>('[data-story="featured"]')
  if (!section) return
  const pin = trackOf(section, pinned)
  const primary = part(section, 'featured-phone-primary')
  const secondary = part(section, 'featured-phone-secondary')
  const orbits = part(section, 'featured-orbits')
  // Pinned-phase drift targets are separate inner nodes (see HomeSections): no shared properties.
  const primaryDrift = part(section, 'featured-phone-primary-drift')
  const secondaryDrift = part(section, 'featured-phone-secondary-drift')
  const orbitsDrift = part(section, 'featured-orbits-drift')
  const copy = part(section, 'featured-copy')
  const label = part(section, 'featured-label')
  const features = parts(section, 'feature')

  const enter = gsap.timeline({
    defaults: { ease: 'power1.out', duration: 1 },
    scrollTrigger: {
      // The non-sticky track is the reliable trigger: the sticky section's own box moves.
      trigger: pin ? pin.track : section,
      start: 'top 85%',
      end: pin ? () => `top top+=${headerOffset()}` : 'top 35%',
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  })
  if (primary) enter.from(primary, { x: -64, rotation: -6, opacity: 0 }, 0)
  if (secondary) enter.from(secondary, { x: 64, rotation: 6, opacity: 0 }, 0.1)
  if (orbits) enter.from(orbits, { scale: 0.92, opacity: 0.5 }, 0)
  if (copy) enter.from(copy, { y: 24, opacity: 0 }, 0)
  if (label) enter.from(label, { y: 12, opacity: 0, duration: 0.4 }, 0.6)

  if (!pin) {
    if (features.length) enter.from(features, { y: 16, opacity: 0, stagger: 0.12 }, 0.2)
    return
  }

  const story = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: pin.track,
      start: () => `top top+=${headerOffset()}`,
      end: () => `+=${pin.spacer.offsetHeight}`,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  })
  const n = Math.max(features.length, 1)
  // Text is never dimmed (WCAG contrast): the row slides in and only its decorative icon badge
  // "lights up".
  features.forEach((feature, i) => {
    story.fromTo(feature, { x: 12 }, { x: 0, duration: 1 / n }, i / n)
    const badge = part(feature, 'feature-badge')
    if (badge) {
      story.fromTo(
        badge,
        { opacity: 0.35, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1 / n },
        i / n,
      )
    }
  })
  if (primaryDrift) story.to(primaryDrift, { y: -16, rotation: -2, duration: 1 }, 0)
  if (secondaryDrift) story.to(secondaryDrift, { y: 16, rotation: 2, duration: 1 }, 0)
  if (orbitsDrift) story.to(orbitsDrift, { scale: 1.04, duration: 1 }, 0)
}

/** Section headings (catalog, process): rise in. */
const buildHeadings = (gsap: Gsap, root: Root) => {
  parts(root, 'heading').forEach((heading) =>
    gsap.from(heading, {
      y: 24,
      opacity: 0,
      ease: 'power1.out',
      scrollTrigger: { trigger: heading, start: 'top 85%', end: 'top 60%', scrub: 0.5 },
    }),
  )
}

/** Catalog: cards rise in with a stagger (on the <li>, never the <article> with its own hover). */
export const buildCatalog = (gsap: Gsap, root: Root) => {
  const cards = parts(root, 'card')
  const grid = cards[0]?.parentElement
  if (!grid) return
  gsap.from(cards, {
    y: 40,
    opacity: 0,
    scale: 0.98,
    ease: 'power1.out',
    stagger: 0.12,
    scrollTrigger: { trigger: grid, start: 'top 85%', end: 'top 35%', scrub: 0.5 },
  })
}

/** Process: a progress line fills across the steps, which light up in order. */
export const buildProcess = (gsap: Gsap, root: Root) => {
  const wrapper = root.querySelector<HTMLElement>('[data-story="process"]')
  if (!wrapper) return
  const steps = parts(wrapper, 'step')
  const line = part(wrapper, 'process-line')
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: wrapper, start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
  })
  if (line) tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
  const n = Math.max(steps.length, 1)
  // Text keeps full opacity (contrast); only the decorative step icon lights up.
  steps.forEach((step, i) => {
    tl.fromTo(step, { y: 12 }, { y: 0, duration: 1 / n }, i / n)
    const icon = part(step, 'step-icon')
    if (icon) {
      tl.fromTo(
        icon,
        { opacity: 0.35, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1 / n },
        i / n,
      )
    }
  })
}

/** About: copy parallax, service cards rise in. */
export const buildAbout = (gsap: Gsap, root: Root) => {
  const section = root.querySelector<HTMLElement>('[data-story="about"]')
  if (!section) return
  const copy = part(section, 'about-copy')
  if (copy) {
    gsap.fromTo(
      copy,
      { y: 48 },
      {
        y: -48,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.4 },
      },
    )
  }
  const services = parts(section, 'service')
  const list = services[0]?.parentElement
  if (list) {
    gsap.from(services, {
      y: 32,
      opacity: 0,
      ease: 'power1.out',
      stagger: 0.15,
      scrollTrigger: { trigger: list, start: 'top 85%', end: 'top 50%', scrub: 0.5 },
    })
  }
}

/** CTA: the band scales in (stays fully opaque), its glow drifts. */
export const buildCta = (gsap: Gsap, root: Root) => {
  const section = root.querySelector<HTMLElement>('[data-story="cta"]')
  if (!section) return
  const card = part(section, 'cta-card')
  const glow = part(section, 'cta-glow')
  if (card) {
    gsap.from(card, {
      scale: 0.95,
      y: 32,
      ease: 'power1.out',
      scrollTrigger: { trigger: card, start: 'top bottom', end: 'clamp(top 60%)', scrub: 0.5 },
    })
  }
  if (glow && card) {
    gsap.to(glow, {
      x: -120,
      y: 80,
      ease: 'none',
      scrollTrigger: { trigger: card, start: 'top bottom', end: 'clamp(bottom top)', scrub: 0.4 },
    })
  }
}

/** Builds every section present on the page (each builder no-ops when its section is absent). */
export const buildHomeStory = (gsap: Gsap, root: Root, options: BuildOptions) => {
  buildHeadings(gsap, root)
  buildCatalog(gsap, root)
  buildFeatured(gsap, root, options)
  buildProcess(gsap, root)
  buildAbout(gsap, root)
  buildCta(gsap, root)
}
