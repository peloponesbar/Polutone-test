import Link from 'next/link'

import type { Product } from '@/payload-types'

import { asImage, MediaImage } from './MediaImage'
import { PlaceholderArt } from './PlaceholderArt'
import { Price } from './Price'
import { focusRing, label } from './ui'

/** Catalog card (DESIGN_SYSTEM.md → «Карточка изделия»). */
export function ProductCard({
  product,
  headingLevel = 'h2',
  priority = false,
}: {
  product: Product
  headingLevel?: 'h2' | 'h3'
  priority?: boolean
}) {
  const Heading = headingLevel
  const image = asImage(product.images?.[0])
  const category = typeof product.category === 'object' ? product.category?.name : null
  const prices = new Set(product.variants?.map((v) => v.price))
  const href = `/catalog/${product.slug}`

  return (
    <article className="group flex min-w-0 flex-col gap-4">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/5] overflow-hidden bg-surface"
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]">
          {image ? (
            <MediaImage media={image} sizes="(min-width: 768px) 25vw, 50vw" priority={priority} />
          ) : (
            <PlaceholderArt seed={product.id} />
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-1 border-t border-primary/10 pt-4">
        {category ? <span className={`${label} text-primary/70`}>{category}</span> : null}
        <Heading className="font-sans text-caption font-normal tracking-body">
          <Link href={href} className={`${focusRing} hover:underline hover:decoration-accent hover:underline-offset-4`}>
            {product.title}
          </Link>
        </Heading>
        <Price
          price={product.price}
          oldPrice={product.oldPrice}
          from={prices.size > 1}
          className="font-sans text-caption tracking-body"
        />
        {!product.inStock ? (
          <span className="font-sans text-caption tracking-body text-primary/70">Нет в наличии</span>
        ) : null}
      </div>
    </article>
  )
}
