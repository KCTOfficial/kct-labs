import { HERO_MAX_SCREENS, slotScreenIndex } from '@/components/home/heroCarouselModel'
import type { PhoneSlot } from '@/components/home/scrollStoryConfig'
import { toImageSource, type ImageSource } from '@/components/site/media'
import type { App } from '@/payload-types'
import { toAccent, type AccentPreset } from '@/utilities/apps/accent'
import { MAX_HIGHLIGHTS, MAX_STEPS } from '@/utilities/apps/sectionLimits'

/**
 * View models of the optional app page sections. Pure: the page maps CMS data once, components only
 * render. Every function tolerates missing, blank or unpopulated data, and a section that ends up
 * empty is `null`/`[]` so the page hides it (an app without new content renders as it always did).
 */
export type DetailHighlight = { icon: string | null; title: string; description: string | null }
export type DetailStep = { title: string; description: string | null; image: ImageSource | null }
export type DetailFeature = { icon: string | null; label: string; description: string | null }

export type DetailSections = {
  accent: AccentPreset | null
  highlights: DetailHighlight[]
  howItWorks: { title: string | null; description: string | null; steps: DetailStep[] } | null
  featuresIntro: { title: string | null; description: string | null }
  features: DetailFeature[]
  dataControl: { title: string; description: string } | null
}

type SectionData = Pick<
  App,
  'accentColor' | 'highlights' | 'howItWorks' | 'featuresIntro' | 'features' | 'dataControl'
>

const clean = (value: string | null | undefined): string | null => value?.trim() || null

export const toDetailSections = (
  app: SectionData,
  stepAlt: (title: string, index: number) => string,
): DetailSections => {
  const highlights = (app.highlights ?? []).flatMap((row) => {
    const title = clean(row.title)
    return title ? [{ icon: clean(row.icon), title, description: clean(row.description) }] : []
  })

  const steps = (app.howItWorks?.steps ?? []).flatMap((row, index) => {
    const title = clean(row.title)
    return title
      ? [
          {
            title,
            description: clean(row.description),
            // Unpopulated or deleted uploads are not objects: no image, never a broken <img>.
            image: toImageSource(row.image, stepAlt(title, index)),
          },
        ]
      : []
  })

  const features = (app.features ?? []).flatMap((row) => {
    const label = clean(row.label)
    return label ? [{ icon: clean(row.icon), label, description: clean(row.description) }] : []
  })

  const dataTitle = clean(app.dataControl?.title)
  const dataDescription = clean(app.dataControl?.description)

  return {
    accent: toAccent(app.accentColor),
    highlights: highlights.slice(0, MAX_HIGHLIGHTS),
    howItWorks:
      steps.length > 0
        ? {
            title: clean(app.howItWorks?.title),
            description: clean(app.howItWorks?.description),
            steps: steps.slice(0, MAX_STEPS),
          }
        : null,
    featuresIntro: {
      title: clean(app.featuresIntro?.title),
      description: clean(app.featuresIntro?.description),
    },
    features,
    dataControl:
      dataTitle && dataDescription ? { title: dataTitle, description: dataDescription } : null,
  }
}

const HERO_SLOTS: PhoneSlot[] = ['left', 'center', 'right']

/**
 * Phones of the detail hero: screenshot 1 in the centre, 2 on the left, 3 on the right (the same
 * assignment as the home carousel; fewer screenshots → fewer phones, none → no phones).
 */
export const heroPhones = (
  screenshots: ImageSource[],
): Array<{ slot: PhoneSlot; image: ImageSource }> => {
  const shots = screenshots.slice(0, HERO_MAX_SCREENS)
  return HERO_SLOTS.flatMap((slot) => {
    const index = slotScreenIndex(shots.length, slot)
    return index === null ? [] : [{ slot, image: shots[index]! }]
  })
}
