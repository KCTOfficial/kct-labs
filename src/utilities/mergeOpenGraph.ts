import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'
import { DEFAULT_OG_IMAGE_PATH, SITE_NAME } from './seo/constants'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'Explore apps designed and developed by PT Kreasindo Cipta Teknologi (KCT), available on Google Play.',
  images: [
    {
      url: `${getServerSideURL()}${DEFAULT_OG_IMAGE_PATH}`,
      width: 1200,
      height: 630,
      alt: SITE_NAME,
    },
  ],
  siteName: SITE_NAME,
  title: SITE_NAME,
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
