import type { MetadataRoute } from 'next'

import { isIndexable, PRIVATE_PATHS } from '@/lib/seo'
import { siteUrl } from '@/lib/site-url'

/** robots.txt: open to crawlers only on production. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
