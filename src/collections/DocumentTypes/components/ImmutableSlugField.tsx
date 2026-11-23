'use client'

import { SlugField } from '@payloadcms/next/client'
import { useDocumentInfo } from '@payloadcms/ui'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof SlugField>

// admin.readOnly is static, so the slug is made read-only here once the document exists.
// The server-side lockSlug hook remains the actual enforcement.
export const ImmutableSlugField = (props: Props) => {
  const { id } = useDocumentInfo()
  const field = { ...props.field, admin: { ...props.field.admin, readOnly: Boolean(id) } }
  return <SlugField {...props} field={field} />
}
