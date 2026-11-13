import React from 'react'

import { serializeJsonLd } from '@/utilities/seo/structuredData'

/** Server-rendered structured data. Content is escaped by `serializeJsonLd`. */
export const JsonLd: React.FC<{ data: Record<string, unknown> | Record<string, unknown>[] }> = ({
  data,
}) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
)
