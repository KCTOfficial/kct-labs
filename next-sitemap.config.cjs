const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://example.com'

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  exclude: ['/posts-sitemap.xml', '/pages-sitemap.xml', '/apps-sitemap.xml', '/*', '/posts/*'],
  robotsTxtOptions: {
    policies: [
      process.env.DISALLOW_INDEXING === 'true'
        ? { userAgent: '*', disallow: '/' }
        : {
            userAgent: '*',
            // `/api/media/` must stay crawlable: app icons, screenshots and OG images are served from it.
            allow: ['/', '/api/media/'],
            disallow: ['/admin', '/api/', '/next/', '/search', '/id/search', '/*?q=', '/*&q='],
          },
    ],
    additionalSitemaps: [
      `${SITE_URL}/apps-sitemap.xml`,
      `${SITE_URL}/pages-sitemap.xml`,
      `${SITE_URL}/posts-sitemap.xml`,
    ],
  },
}
