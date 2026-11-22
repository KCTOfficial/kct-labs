import { ArrowRight, Globe, Mail, MessageCircle, Store } from 'lucide-react'
import React from 'react'

import { appHref } from '@/components/site/AppCard'
import { ButtonLink } from '@/components/site/ButtonLink'
import { Eyebrow } from '@/components/site/Eyebrow'
import { firstMedia, toImageSource } from '@/components/site/media'
import { PhoneFrame } from '@/components/site/PhoneFrame'
import { SiteIcon } from '@/components/site/SiteIcon'
import { format, localizeHref, type Dictionary, type Locale } from '@/i18n'
import type { App, Home } from '@/payload-types'
import { toWhatsAppNumber } from '@/utilities/apps/validation'
import { cn } from '@/utilities/ui'

const h2Class =
  'font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground lg:text-[44px] lg:leading-[1.1]'

const ORBITS = ['size-[19%]', 'size-[38%]', 'size-[58%]', 'size-[77%]', 'size-[96%]']

const asApp = (value: unknown): App | null =>
  value && typeof value === 'object' && 'slug' in value && (value as App).status !== 'archived'
    ? (value as App)
    : null

export const HomeFeatured: React.FC<{
  featured: Home['featured']
  index: number
  locale: Locale
  dict: Dictionary
}> = ({ featured, index, locale, dict }) => {
  const app = asApp(featured?.app)
  const secondary = asApp(featured?.secondaryApp)
  const shot = (a: App | null, i: number) =>
    a
      ? toImageSource(
          firstMedia(a.screenshots?.slice(i)) ?? firstMedia(a.screenshots),
          format(dict.app.screenshotAlt, { name: a.name, index: i + 1 }),
        )
      : null
  const primaryImage = shot(app, 1)
  const secondaryImage = shot(secondary, 1)

  return (
    <section aria-labelledby="featured-title" className="border-y border-border bg-bg-raised">
      <div className="site-container flex flex-col gap-5 py-14 lg:flex-row lg:items-center lg:gap-20 lg:py-28">
        <div className="reveal relative order-2 hidden aspect-square w-full max-w-[620px] shrink-0 overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_50%_45%,color-mix(in_srgb,var(--brand-sky)_20%,transparent),transparent_70%)] lg:order-1 lg:block lg:w-[45%]">
          {ORBITS.map((size) => (
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-grid-line',
                size,
              )}
              key={size}
            />
          ))}
          {primaryImage && (
            <PhoneFrame
              className="absolute left-[18%] top-[10%] w-[42%]"
              image={primaryImage}
              sizes="260px"
            />
          )}
          {secondaryImage && (
            <PhoneFrame
              className="absolute left-[48%] top-[18%] w-[35%]"
              image={secondaryImage}
              sizes="220px"
            />
          )}
          {featured?.visualLabel && (
            <p className="absolute bottom-6 left-6 rounded-[10px] border border-border-strong bg-bg-raised px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.07em] text-primary">
              {featured.visualLabel}
            </p>
          )}
        </div>

        <div className="order-1 flex flex-1 flex-col gap-5 lg:order-2 lg:gap-8">
          <div className="reveal flex flex-col gap-3 lg:gap-4">
            {featured?.eyebrow && <Eyebrow index={index}>{featured.eyebrow}</Eyebrow>}
            <h2 className={h2Class} id="featured-title">
              {featured?.title}
            </h2>
            {featured?.description && (
              <p className="hidden text-[17px] leading-relaxed text-text-secondary lg:block">
                {featured.description}
              </p>
            )}
          </div>

          {primaryImage && (
            <div className="relative h-[300px] overflow-hidden rounded-lg border border-border lg:hidden">
              <PhoneFrame
                className="absolute left-1/2 top-6 w-[52%] -translate-x-1/2"
                image={primaryImage}
                sizes="180px"
              />
            </div>
          )}

          {featured?.features && featured.features.length > 0 && (
            <ul className="flex flex-col gap-3 lg:gap-5">
              {featured.features.map((f) => (
                <li
                  className="reveal flex items-center gap-3 lg:items-start lg:gap-4"
                  key={f.id ?? f.title}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft lg:size-11 lg:rounded-[12px]">
                    <SiteIcon className="size-[18px] text-primary lg:size-5" name={f.icon} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[15px] font-medium text-foreground lg:text-[17px] lg:font-semibold">
                      {f.title}
                    </h3>
                    {f.description && (
                      <p className="hidden text-[15px] leading-[1.55] text-text-secondary lg:block">
                        {f.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {app && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink className="w-full sm:w-auto" href={appHref(app.slug, locale)}>
                {featured?.ctaLabel || `${app.name}`}
                <ArrowRight aria-hidden="true" className="size-[18px]" />
              </ButtonLink>
              {app.playStoreUrl && (
                <ButtonLink
                  className="hidden sm:inline-flex"
                  href={app.playStoreUrl}
                  variant="ghost"
                >
                  <Store aria-hidden="true" className="size-[18px]" />
                  Google Play
                </ButtonLink>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export const HomeProcess: React.FC<{
  process: Home['process']
  index: number
  dict: Dictionary
}> = ({ process, index, dict }) => {
  const steps = process?.steps ?? []
  return (
    <section aria-labelledby="process-title" className="scroll-mt-20" id="process">
      <div className="site-container flex flex-col gap-5 py-14 lg:gap-14 lg:py-28">
        <div className="reveal flex max-w-[640px] flex-col gap-3 lg:gap-4">
          {process?.eyebrow && <Eyebrow index={index}>{process.eyebrow}</Eyebrow>}
          <h2 className={h2Class} id="process-title">
            {process?.title}
          </h2>
          {process?.subtitle && (
            <p className="hidden text-[17px] leading-relaxed text-text-secondary lg:block">
              {process.subtitle}
            </p>
          )}
        </div>
        {/* `reveal` goes on the <ol>, not the <li>s: overflow-hidden makes the <ol> a scroll container,
            which would hijack the children's view() timeline (they would never animate). */}
        <ol className="reveal grid overflow-hidden rounded-lg border border-border lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              className={cn(
                'flex gap-4 border-border p-5 lg:flex-col lg:gap-5 lg:p-8',
                i < steps.length - 1 && 'border-b lg:border-b-0 lg:border-r',
                i === 2 && 'lg:bg-primary-soft',
              )}
              key={step.id ?? step.title}
            >
              <div className="flex items-center justify-between lg:w-full">
                <span className="font-mono text-[13px] text-primary lg:text-xs lg:tracking-[0.08em]">
                  <span className="hidden lg:inline">{dict.home.step} </span>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <SiteIcon
                  className="hidden size-[22px] text-text-secondary lg:block"
                  name={step.icon}
                />
              </div>
              <div className="flex flex-col gap-1 lg:gap-5">
                <h3 className="font-display text-lg font-semibold text-foreground lg:text-2xl">
                  {step.title}
                </h3>
                {step.description && (
                  <p className="text-sm leading-[1.55] text-text-secondary lg:text-[15px]">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export const HomeAbout: React.FC<{ about: Home['about']; index: number; locale: Locale }> = ({
  about,
  index,
  locale,
}) => (
  <section
    aria-labelledby="about-title"
    className="scroll-mt-20 border-t border-border bg-bg-raised"
    id="about"
  >
    <div className="site-container grid gap-10 py-14 lg:grid-cols-[480px_1fr] lg:gap-20 lg:py-28">
      <div className="reveal flex flex-col gap-5 lg:gap-6">
        {about?.eyebrow && <Eyebrow index={index}>{about.eyebrow}</Eyebrow>}
        <h2 className={h2Class} id="about-title">
          {about?.title}
        </h2>
        {about?.body && (
          <p className="text-base leading-[1.65] text-text-secondary lg:text-[17px]">
            {about.body}
          </p>
        )}
        {about?.linkUrl && (
          <ButtonLink
            className="self-start"
            href={localizeHref(about.linkUrl, locale)}
            variant="ghost"
          >
            <Globe aria-hidden="true" className="size-[18px]" />
            {about.linkLabel || about.linkUrl}
          </ButtonLink>
        )}
      </div>
      {about?.services && about.services.length > 0 && (
        <ul className="grid scroll-mt-20 gap-5 sm:grid-cols-2" id="services">
          {about.services.map((s) => (
            <li
              className="reveal flex flex-col gap-3.5 rounded-md border border-border bg-surface p-7"
              key={s.id ?? s.title}
            >
              <SiteIcon className="size-[26px] text-primary" name={s.icon} />
              <h3 className="font-display text-xl font-semibold text-foreground">{s.title}</h3>
              {s.description && (
                <p className="text-[15px] leading-[1.55] text-text-secondary">{s.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
)

export const HomeCta: React.FC<{ cta: Home['cta'] }> = ({ cta }) => {
  const whatsapp = cta?.whatsappNumber
    ? `https://wa.me/${toWhatsAppNumber(cta.whatsappNumber)}`
    : null
  return (
    <section aria-labelledby="cta-title" className="scroll-mt-20" id="contact">
      <div className="site-container pb-14 pt-2 lg:py-24">
        <div className="reveal relative flex flex-col gap-6 overflow-hidden rounded-[24px] border border-border-strong bg-brand-navy p-7 lg:flex-row lg:items-center lg:justify-between lg:rounded-[28px] lg:p-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-1/4 -top-1/2 size-[900px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-sky)_60%,transparent),transparent_65%)]"
          />
          <div className="relative flex max-w-[640px] flex-col gap-3.5">
            {cta?.kicker && (
              <p className="font-mono text-xs tracking-[0.1em] text-on-brand-accent lg:text-[13px]">
                {cta.kicker}
              </p>
            )}
            <h2
              className="font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-white lg:text-[40px] lg:leading-[1.12]"
              id="cta-title"
            >
              {cta?.title}
            </h2>
            {cta?.body && (
              <p className="hidden text-[17px] leading-relaxed text-on-brand-muted lg:block">
                {cta.body}
              </p>
            )}
          </div>
          <div className="relative flex flex-col gap-3 lg:w-[260px]">
            {whatsapp && (
              <ButtonLink className="w-full" href={whatsapp} size="lg" variant="light">
                <MessageCircle aria-hidden="true" className="size-[18px]" />
                {cta?.whatsappLabel || 'WhatsApp'}
              </ButtonLink>
            )}
            {cta?.email && (
              <ButtonLink
                className="hidden w-full lg:inline-flex"
                href={`mailto:${cta.email}`}
                size="lg"
                variant="outline-light"
              >
                <Mail aria-hidden="true" className="size-[18px]" />
                {cta.email}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
