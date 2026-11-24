declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string
      /** "true" on staging/preview: noindex + Disallow-all robots.txt */
      DISALLOW_INDEXING?: string
      /** GA4 Measurement ID (G-XXXXXXXXXX). Read at build time; empty = analytics off. */
      NEXT_PUBLIC_GA_MEASUREMENT_ID?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
