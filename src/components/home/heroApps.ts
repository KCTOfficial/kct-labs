import { appHref } from '@/components/site/AppCard'
import { isMedia, toImageSource } from '@/components/site/media'
import { format, type Dictionary, type Locale } from '@/i18n'

import { HERO_MAX_SCREENS } from './heroCarouselModel'
import type { HeroApp } from './HeroStage'
import type { ShowcaseApp } from './HomeHero'

/** Pure mapping of a showcase app to serializable hero data; non-populated uploads are skipped. */
export const toHeroApp = (app: ShowcaseApp, locale: Locale, dict: Dictionary): HeroApp => {
  const screens = (app.screenshots ?? [])
    .filter(isMedia)
    .slice(0, HERO_MAX_SCREENS)
    .flatMap((media, i) => {
      const source = toImageSource(
        media,
        format(dict.app.screenshotAlt, { name: app.name, index: i + 1 }),
      )
      return source ? [source] : []
    })
  return {
    id: app.id,
    name: app.name,
    href: appHref(app.slug, locale),
    shortDescription: app.shortDescription?.trim() || null,
    image: screens[0] ?? null,
    screens,
    icon: isMedia(app.icon)
      ? {
          url: app.icon.url,
          updatedAt: app.icon.updatedAt,
          width: app.icon.width,
          height: app.icon.height,
          alt: app.icon.alt,
        }
      : null,
  }
}
