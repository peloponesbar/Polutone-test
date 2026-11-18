import { cardColors } from '@/lib/catalog/colors'
import { defaultColor } from '@/lib/catalog/variants'
import type { Media, Product } from '@/payload-types'

import { asImage, toImageData } from './MediaImage'
import { ProductCardView } from './ProductCardView'

/** Catalog card (DESIGN_SYSTEM.md → «Карточка изделия»): prepares data for the interactive view. */
export function ProductCard({
  product,
  headingLevel = 'h2',
  priority = false,
}: {
  product: Product
  headingLevel?: 'h2' | 'h3'
  priority?: boolean
}) {
  const variants = (product.variants ?? []).map((v) => ({ ...v, color: v.color ?? '' }))
  const photos = (product.images ?? [])
    .map(asImage)
    .filter((m): m is Media => m !== null)
    .map(toImageData)

  return (
    <ProductCardView
      id={product.id}
      href={`/catalog/${product.slug}`}
      title={product.title}
      category={typeof product.category === 'object' ? (product.category?.name ?? null) : null}
      price={product.price}
      oldPrice={product.oldPrice ?? null}
      priceVaries={new Set(variants.map((v) => v.price)).size > 1}
      inStock={Boolean(product.inStock)}
      colors={cardColors(variants, photos)}
      initialColor={defaultColor(variants)}
      fallbackImage={photos[0] ?? null}
      headingLevel={headingLevel}
      priority={priority}
    />
  )
}
