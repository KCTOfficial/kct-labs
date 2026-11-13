import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { localizedLabel } from '@/fields/localizedLabel'
import { defaultLocale } from '@/i18n/config'
import { isValidPhone, optionalText, requiredInDefaultLocale } from '@/utilities/apps/validation'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
        localizedLabel,
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Footer/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'tagline',
      type: 'textarea',
      admin: { description: 'Short text under the company name.' },
      localized: true,
      maxLength: 300,
    },
    {
      name: 'columns',
      type: 'array',
      admin: {
        description: 'Link columns. When empty, the nav items above are shown as a single column.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
          maxLength: 40,
          validate: requiredInDefaultLocale(defaultLocale),
        },
        {
          name: 'links',
          type: 'array',
          fields: [link({ appearances: false }), localizedLabel],
          maxRows: 8,
        },
      ],
      maxRows: 3,
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'email', type: 'email', admin: { width: '50%' } },
            {
              name: 'whatsapp',
              type: 'text',
              admin: { description: 'e.g. 081223344939', width: '50%' },
              maxLength: 20,
              validate: optionalText(isValidPhone, 'Invalid phone number.'),
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'phone',
              type: 'text',
              admin: { width: '50%' },
              maxLength: 20,
              validate: optionalText(isValidPhone, 'Invalid phone number.'),
            },
            {
              name: 'address',
              type: 'text',
              admin: { width: '50%' },
              localized: true,
              maxLength: 120,
            },
          ],
        },
      ],
    },
    {
      name: 'copyrightHolder',
      type: 'text',
      defaultValue: 'PT Kreasindo Cipta Teknologi',
      maxLength: 80,
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
