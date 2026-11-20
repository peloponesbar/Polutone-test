import type { Payload, PayloadRequest } from 'payload'

import { PUBLIC_PRODUCTS } from '@/collections/Products'
import { imagesForColor } from '@/lib/catalog/images'
import type { Media, Product } from '@/payload-types'

import { type CartLine, type PricedCart, priceCart, type VariantInfo } from './cart'

const asMedia = (value: number | Media | null | undefined): Media | null =>
  value && typeof value === 'object' && value.url && value.mimeType?.startsWith('image/') ? value : null

/** Every variant of the visible products, keyed by variant id. */
function variantsOf(products: Product[], wanted: Set<string>): Map<string, VariantInfo> {
  const map = new Map<string, VariantInfo>()
  for (const product of products) {
    const images = (product.images ?? []).map(asMedia).filter((m): m is Media => m !== null)
    const weight = typeof product.category === 'object' ? (product.category?.itemWeight ?? null) : null
    for (const v of product.variants ?? []) {
      if (!wanted.has(v.externalId)) continue
      const color = v.color ?? ''
      const photo = imagesForColor(images, color || null)[0]
      map.set(v.externalId, {
        variantId: v.externalId,
        productId: product.id,
        title: product.title,
        slug: product.slug,
        color,
        size: v.size,
        price: v.price,
        oldPrice: product.oldPrice ?? null,
        available: Math.max(0, v.available),
        image: photo?.url ? { url: photo.url, alt: photo.alt } : null,
        weight,
      })
    }
  }
  return map
}

/**
 * Prices cart lines with current data. Only published products that are still in
 * MoySklad count: a draft, a hidden or a deleted product shows up as `missing`.
 */
export async function quoteCart(payload: Payload, lines: CartLine[], req?: PayloadRequest): Promise<PricedCart> {
  if (lines.length === 0) return priceCart([], new Map())
  const ids = lines.map((l) => l.variantId)
  const result = await payload.find({
    collection: 'products',
    where: { and: [PUBLIC_PRODUCTS, { 'variants.externalId': { in: ids } }] },
    limit: lines.length,
    depth: 1,
    // Visitors' view: never the latest admin draft.
    draft: false,
    req,
  })
  return priceCart(lines, variantsOf(result.docs, new Set(ids)))
}
