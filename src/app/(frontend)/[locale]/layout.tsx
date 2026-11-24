import type { Metadata, Viewport } from 'next'

import { cn } from '@/utilities/ui'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { QuickViewProvider } from '@/components/quick-view/QuickViewProvider'
import { isQuickViewEnabled } from '@/components/quick-view/config'
import type { QuickViewLabels } from '@/components/quick-view/types'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { getDictionary, isLocale, localeTags, locales } from '@/i18n'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { SITE_NAME } from '@/utilities/seo/constants'

import '../globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['500', '600', '700'],
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
  // Only used for small labels: keep it off the critical path (no <link rel="preload">).
  preload: false,
})

type LayoutArgs = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function RootLayout({ children, params }: LayoutArgs) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const { isEnabled } = await draftMode()
  const dict = getDictionary(locale)
  // Cards are plain links to the full page by default; the popup is opt-in (see quick-view/config).
  const quickViewEnabled = isQuickViewEnabled(isEnabled)
  const quickViewLabels: QuickViewLabels = {
    close: dict.a11y.close,
    loading: dict.quickView.loading,
    error: dict.quickView.error,
    retry: dict.quickView.retry,
    viewFullDetails: dict.quickView.viewFullDetails,
    getOnGooglePlay: dict.app.getOnGooglePlay,
    legal: dict.legal.title,
    screenshots: dict.quickView.screenshots,
    highlights: dict.quickView.highlights,
    ageRating: dict.detail.ageRating,
  }

  return (
    <html
      className={cn(inter.variable, spaceGrotesk.variable, jetbrainsMono.variable)}
      lang={localeTags[locale]}
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
      </head>
      <body>
        <Providers>
          <a
            className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            href="#main-content"
          >
            {dict.a11y.skipToContent}
          </a>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header locale={locale} />
          <main className="flex-1" id="main-content">
            {children}
          </main>
          <Footer locale={locale} />
          <QuickViewProvider enabled={quickViewEnabled} labels={quickViewLabels} />
        </Providers>
        <GoogleAnalytics isPreview={isEnabled} />
      </body>
    </html>
  )
}

export async function generateMetadata({ params }: Pick<LayoutArgs, 'params'>): Promise<Metadata> {
  const { locale: param } = await params
  const locale = isLocale(param) ? param : 'en'
  const dict = getDictionary(locale)
  // Staging/preview deployments set DISALLOW_INDEXING=true so they never compete with production.
  const disallowIndexing = process.env.DISALLOW_INDEXING === 'true'

  return {
    metadataBase: new URL(getServerSideURL()),
    applicationName: SITE_NAME,
    title: { default: dict.meta.defaultTitle, template: `%s | ${SITE_NAME}` },
    description: dict.meta.defaultDescription,
    openGraph: mergeOpenGraph({ description: dict.meta.defaultDescription }),
    twitter: { card: 'summary_large_image' },
    icons: {
      icon: [
        // KCT Hub mark. No SVG variant: only raster artwork exists (see docs on requesting an SVG).
        { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    formatDetection: { telephone: false, email: false, address: false },
    robots: disallowIndexing
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { 'max-image-preview': 'large', 'max-snippet': -1 },
        },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#070d1a' },
  ],
}
