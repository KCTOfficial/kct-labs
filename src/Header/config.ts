import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { localizedLabel } from '@/fields/localizedLabel'
import { isSafeHref, optionalText } from '@/utilities/apps/validation'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: GlobalConfig = {
  slug: 'header',
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
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'cta',
      type: 'group',
      admin: {
        description:
          'Primary button on the right side of the header. Hidden when the label is empty.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              admin: { width: '50%' },
              localized: true,
              maxLength: 40,
            },
            {
              name: 'url',
              type: 'text',
              admin: { description: 'Site path (/#contact) or https URL.', width: '50%' },
              maxLength: 300,
              validate: optionalText(
                isSafeHref,
                'Use a site path starting with "/" or an https URL.',
              ),
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
