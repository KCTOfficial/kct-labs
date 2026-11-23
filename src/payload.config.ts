import { postgresAdapter } from '@payloadcms/db-postgres';
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { AppCategories } from './collections/AppCategories'
import { DocumentTypes } from './collections/DocumentTypes'
import { Apps } from './collections/Apps'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { Home } from './globals/Home/config'
import { defaultLocale, localeLabels, locales } from './i18n/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { withoutLocalization } from './utilities/withoutLocalization'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
    admin: {
        components: {
            // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
            // Feel free to delete this at any time. Simply remove the line below.
            beforeLogin: ['@/components/BeforeLogin'],
            // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
            // Feel free to delete this at any time. Simply remove the line below.
            beforeDashboard: ['@/components/BeforeDashboard'],
            // KCT Hub branding: login-page logo and navigation icon.
            graphics: {
                Logo: '@/components/AdminBrand#AdminLogo',
                Icon: '@/components/AdminBrand#AdminIcon',
            },
        },
        meta: {
            titleSuffix: ' — KCT Hub Admin',
            icons: [
                { rel: 'icon', url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
                { rel: 'icon', type: 'image/png', url: '/icon-512.png', sizes: '512x512' },
                { rel: 'apple-touch-icon', url: '/apple-touch-icon.png', sizes: '180x180' },
            ],
        },
        importMap: {
            baseDir: path.resolve(dirname),
        },
        user: Users.slug,
        livePreview: {
            breakpoints: [
                {
                    label: 'Mobile',
                    name: 'mobile',
                    width: 375,
                    height: 667,
                },
                {
                    label: 'Tablet',
                    name: 'tablet',
                    width: 768,
                    height: 1024,
                },
                {
                    label: 'Desktop',
                    name: 'desktop',
                    width: 1440,
                    height: 900,
                },
            ],
        },
    },
    // This config helps us configure global or default features that the other editors can inherit
    editor: defaultLexical,
    db: postgresAdapter({
        pool: {
            connectionString: process.env.DATABASE_URL || '',
        },
    }),
    // Pages and Posts predate localization: `withoutLocalization` keeps their schema (and stored data)
    // unchanged by neutralising the `localized` flags the SEO plugin fields carry.
    collections: [
        withoutLocalization(Pages),
        withoutLocalization(Posts),
        Media,
        Categories,
        Users,
        Apps,
        AppCategories,
        DocumentTypes,
    ],
    cors: [getServerSideURL()].filter(Boolean),
    globals: [Header, Footer, Home],
    localization: {
        locales: locales.map((code) => ({ code, label: localeLabels[code] })),
        defaultLocale,
        fallback: true,
    },
    plugins,
    secret: process.env.PAYLOAD_SECRET,
    sharp,
    typescript: {
        outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
    jobs: {
        access: {
            run: ({ req }: { req: PayloadRequest }): boolean => {
                // Allow logged in users to execute this endpoint (default)
                if (req.user) return true

                const secret = process.env.CRON_SECRET
                if (!secret) return false

                // If there is no logged in user, then check
                // for the Vercel Cron secret to be present as an
                // Authorization header:
                const authHeader = req.headers.get('authorization')
                return authHeader === `Bearer ${secret}`
            },
        },
        tasks: [],
    },
})
