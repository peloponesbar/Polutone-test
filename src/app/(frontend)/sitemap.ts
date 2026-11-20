import config from '@payload-config'
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

import { PUBLIC_PRODUCTS } from '@/collections/Products'
import { catalogCanonical } from '@/lib/seo'
import { listCategories } from '@/lib/catalog/queries'
import { PUBLISHED } from '@/lib/preview'
import { siteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const payload = await getPayload({ config })
  const [products, infoPages, categories] = await Promise.all([
    payload.find({ collection: 'products', where: PUBLIC_PRODUCTS, limit: 0, depth: 0, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'info-pages', where: PUBLISHED, limit: 0, depth: 0, select: { slug: true, updatedAt: true } }),
    listCategories(),
  ])

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}${catalogCanonical(c.slug)}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...products.docs.map((p) => ({
      url: `${base}/catalog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    { url: `${base}/info`, changeFrequency: 'monthly', priority: 0.4 },
    ...infoPages.docs.map((p) => ({ url: `${base}/info/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.4 })),
  ]
}
