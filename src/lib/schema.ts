import type { ContactLink } from '@/lib/settings/format'

/** schema.org JSON-LD builders. Pure functions: the page passes data in, tags come out. */

type Json = Record<string, unknown>

const absolute = (base: string, url: string) => (/^https?:\/\//i.test(url) ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`)

export function organizationSchema(base: string, contacts: ContactLink[], logoPath = '/logos/POLUTONE_sage_dark.svg'): Json {
  const phone = contacts.find((c) => c.kind === 'phone')
  const email = contacts.find((c) => c.kind === 'email')
  const sameAs = contacts.filter((c) => c.external && /^https?:/.test(c.href)).map((c) => c.href)
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'POLUTONE',
    url: base,
    logo: absolute(base, logoPath),
    ...(sameAs.length ? { sameAs } : {}),
    ...(phone || email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            availableLanguage: 'ru',
            ...(phone ? { telephone: phone.href.replace(/^tel:/, '') } : {}),
            ...(email ? { email: email.href.replace(/^mailto:/, '') } : {}),
          },
        }
      : {}),
  }
}

export function websiteSchema(base: string): Json {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: 'POLUTONE', url: base, inLanguage: 'ru' }
}

export type Crumb = { label: string; path?: string }

export function breadcrumbSchema(base: string, crumbs: Crumb[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.path ? { item: absolute(base, c.path) } : {}),
    })),
  }
}

export type ProductSchemaInput = {
  title: string
  slug: string
  description?: string | null
  article?: string | null
  category?: string | null
  images: string[]
  variants: { price: number; available: number }[]
  price: number
}

export function productSchema(base: string, p: ProductSchemaInput): Json {
  const prices = p.variants.length ? p.variants.map((v) => v.price) : [p.price]
  const inStock = p.variants.some((v) => v.available > 0)
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  const availability = `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`
  const url = absolute(base, `/catalog/${p.slug}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    url,
    brand: { '@type': 'Brand', name: 'POLUTONE' },
    ...(p.description ? { description: p.description } : {}),
    ...(p.article ? { sku: p.article } : {}),
    ...(p.category ? { category: p.category } : {}),
    ...(p.images.length ? { image: p.images.map((i) => absolute(base, i)) } : {}),
    offers:
      low === high
        ? { '@type': 'Offer', url, priceCurrency: 'RUB', price: low, availability, itemCondition: 'https://schema.org/NewCondition' }
        : { '@type': 'AggregateOffer', url, priceCurrency: 'RUB', lowPrice: low, highPrice: high, offerCount: p.variants.length, availability },
  }
}

/** Serialises JSON-LD for a <script> tag; `<` is escaped so content can't close the tag. */
const BACKSLASH = String.fromCharCode(92)
export const serializeJsonLd = (data: Json | Json[]) => JSON.stringify(data).replace(/</g, BACKSLASH + 'u003c')
