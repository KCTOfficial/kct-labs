import type { Field, GlobalConfig, TextField, TextareaField } from 'payload'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { iconSelect } from '../../fields/iconSelect'
import { defaultLocale } from '../../i18n/config'
import { HERO_SHOWCASE_MAX } from '../../utilities/apps/heroShowcase'
import {
  isSafeHref,
  isValidPhone,
  optionalText,
  requiredInDefaultLocale,
} from '../../utilities/apps/validation'
import { revalidateHome } from './hooks/revalidateHome'

const text = (name: string, overrides: Partial<TextField> = {}): TextField =>
  ({ name, type: 'text', localized: true, maxLength: 160, ...overrides }) as TextField

const textarea = (name: string, overrides: Partial<TextareaField> = {}): TextareaField =>
  ({ name, type: 'textarea', localized: true, maxLength: 400, ...overrides }) as TextareaField

const href = (name: string, description?: string): TextField => ({
  name,
  type: 'text',
  admin: { description: description ?? 'Site path (/apps) or https URL.' },
  maxLength: 300,
  validate: optionalText(isSafeHref, 'Use a site path starting with "/" or an https URL.'),
})

const enabled: Field = {
  name: 'enabled',
  type: 'checkbox',
  defaultValue: true,
  label: 'Show this section',
}

const iconItems = (name: string, maxRows: number): Field => ({
  name,
  type: 'array',
  admin: { initCollapsed: true },
  fields: [
    iconSelect(),
    text('title', { maxLength: 80, validate: requiredInDefaultLocale(defaultLocale) }),
    textarea('description', { maxLength: 240 }),
  ],
  maxRows,
})

export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Home',
  access: {
    read: anyone,
    update: authenticated,
  },
  admin: {
    description:
      'Content of the home page. All text fields are translated per locale (switch locale at the top).',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'hero',
          label: 'Hero',
          fields: [
            text('badge', {
              admin: { description: 'Short uppercase label above the headline.' },
              maxLength: 60,
            }),
            text('headline', { maxLength: 120, validate: requiredInDefaultLocale(defaultLocale) }),
            textarea('subheadline', { maxLength: 300 }),
            {
              type: 'row',
              fields: [
                text('primaryCtaLabel', { admin: { width: '50%' }, maxLength: 40 }),
                { ...href('primaryCtaUrl'), admin: { width: '50%' }, defaultValue: '/apps' },
              ],
            },
            {
              type: 'row',
              fields: [
                text('secondaryCtaLabel', { admin: { width: '50%' }, maxLength: 40 }),
                { ...href('secondaryCtaUrl'), admin: { width: '50%' } },
              ],
            },
            {
              name: 'showcaseApps',
              type: 'relationship',
              admin: {
                description: `Up to ${HERO_SHOWCASE_MAX} apps rotate in the phone stage (their first screenshot is used; the first app starts in the centre). Empty = featured apps.`,
              },
              hasMany: true,
              maxRows: HERO_SHOWCASE_MAX,
              relationTo: 'apps',
            },
          ],
        },
        {
          name: 'catalog',
          label: 'Apps section',
          fields: [
            text('eyebrow', { maxLength: 40 }),
            text('title', { maxLength: 120 }),
            textarea('subtitle', { maxLength: 300 }),
            {
              name: 'limit',
              type: 'number',
              admin: { description: 'Maximum apps shown on the home page (desktop grid).' },
              defaultValue: 7,
              max: 24,
              min: 1,
              required: true,
            },
            {
              name: 'showServiceCard',
              type: 'checkbox',
              defaultValue: true,
              label: 'Show the "development services" card after the apps',
            },
            {
              name: 'serviceCard',
              type: 'group',
              admin: { condition: (_, siblingData) => Boolean(siblingData?.showServiceCard) },
              fields: [
                text('badge', { maxLength: 40 }),
                text('title', { maxLength: 80 }),
                textarea('body', { maxLength: 200 }),
                {
                  type: 'row',
                  fields: [
                    text('ctaLabel', { admin: { width: '50%' }, maxLength: 40 }),
                    { ...href('ctaUrl'), admin: { width: '50%' } },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'featured',
          label: 'Featured',
          fields: [
            enabled,
            text('eyebrow', { maxLength: 40 }),
            text('title', { maxLength: 120 }),
            textarea('description', { maxLength: 400 }),
            {
              type: 'row',
              fields: [
                {
                  name: 'app',
                  type: 'relationship',
                  admin: { description: 'Primary app (CTA links to it).', width: '50%' },
                  relationTo: 'apps',
                },
                {
                  name: 'secondaryApp',
                  type: 'relationship',
                  admin: { description: 'Optional second phone in the visual.', width: '50%' },
                  relationTo: 'apps',
                },
              ],
            },
            text('visualLabel', {
              admin: { description: 'Small label on the visual, e.g. "KOORVA SUITE".' },
              maxLength: 40,
            }),
            iconItems('features', 6),
            text('ctaLabel', { maxLength: 40 }),
          ],
        },
        {
          name: 'process',
          label: 'How we work',
          fields: [
            enabled,
            text('eyebrow', { maxLength: 40 }),
            text('title', { maxLength: 120 }),
            textarea('subtitle', { maxLength: 300 }),
            iconItems('steps', 6),
          ],
        },
        {
          name: 'about',
          label: 'About',
          fields: [
            enabled,
            text('eyebrow', { maxLength: 40 }),
            text('title', { maxLength: 120 }),
            textarea('body', { maxLength: 800 }),
            {
              type: 'row',
              fields: [
                text('linkLabel', { admin: { width: '50%' }, maxLength: 40 }),
                { ...href('linkUrl'), admin: { width: '50%' } },
              ],
            },
            iconItems('services', 8),
          ],
        },
        {
          name: 'cta',
          label: 'Call to action',
          fields: [
            enabled,
            text('kicker', { maxLength: 60 }),
            text('title', { maxLength: 120 }),
            textarea('body', { maxLength: 300 }),
            {
              type: 'row',
              fields: [
                text('whatsappLabel', { admin: { width: '50%' }, maxLength: 40 }),
                {
                  name: 'whatsappNumber',
                  type: 'text',
                  admin: { description: 'e.g. 081223344939', width: '50%' },
                  maxLength: 20,
                  validate: optionalText(isValidPhone, 'Invalid phone number.'),
                },
              ],
            },
            { name: 'email', type: 'email' },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: false }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: false,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHome],
  },
}
