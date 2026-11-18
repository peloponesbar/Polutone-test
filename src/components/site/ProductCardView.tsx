'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { CardColor } from '@/lib/catalog/colors'

import { MediaImage, type ImageData } from './MediaImage'
import { PlaceholderArt } from './PlaceholderArt'
import { Price } from './Price'
import { focusRing, label } from './ui'

type Props = {
  id: number
  href: string
  title: string
  category: string | null
  price: number
  oldPrice: number | null
  priceVaries: boolean
  inStock: boolean
  colors: CardColor<ImageData>[]
  initialColor: string | null
  fallbackImage: ImageData | null
  headingLevel: 'h2' | 'h3'
  priority: boolean
}

/**
 * Catalog card with color swatches under the text: choosing a color swaps the photo,
 * and the links open the product page in that color.
 */
export function ProductCardView({
  id,
  href,
  title,
  category,
  price,
  oldPrice,
  priceVaries,
  inStock,
  colors,
  initialColor,
  fallbackImage,
  headingLevel,
  priority,
}: Props) {
  const Heading = headingLevel
  const [color, setColor] = useState(initialColor)
  const selected = colors.find((c) => c.name === color) ?? null
  const image = selected ? selected.image : fallbackImage
  const link = color ? `${href}?color=${encodeURIComponent(color)}` : href

  return (
    <article className="group flex min-w-0 flex-col gap-4">
      <Link
        href={link}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/5] overflow-hidden bg-surface"
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]">
          {image ? (
            <MediaImage media={image} sizes="(min-width: 768px) 25vw, 50vw" priority={priority} />
          ) : (
            <PlaceholderArt seed={id} />
          )}
        </div>
      </Link>

      <div className="flex flex-col gap-1 border-t border-primary/10 pt-4">
        {category ? <span className={`${label} text-primary/70`}>{category}</span> : null}
        <Heading className="font-sans text-caption font-normal tracking-body">
          <Link href={link} className={`${focusRing} hover:underline hover:decoration-accent hover:underline-offset-4`}>
            {title}
          </Link>
        </Heading>
        <Price price={price} oldPrice={oldPrice} from={priceVaries} className="font-sans text-caption tracking-body" />

        {colors.length > 1 ? (
          <div role="radiogroup" aria-label={`Цвет: ${title}`} className="-ml-2 flex flex-wrap">
            {colors.map((c) => {
              const checked = c.name === color
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={c.inStock ? c.name : `${c.name}, нет в наличии`}
                  title={c.name}
                  onClick={() => setColor(c.name)}
                  className={`group/swatch inline-flex size-8 items-center justify-center ${focusRing}`}
                >
                  {/* Square swatch (no rounding — brandbook); a graphite frame marks the chosen color. */}
                  <span
                    aria-hidden="true"
                    className={`block size-4 border outline outline-offset-2 transition-[outline-color] duration-300 ${
                      checked ? 'outline-primary' : 'outline-transparent group-hover/swatch:outline-primary/40'
                    } ${c.hex ? 'border-primary/20' : 'border-primary/60'} ${c.inStock ? '' : 'opacity-40'}`}
                    style={c.hex ? { backgroundColor: c.hex } : undefined}
                  />
                </button>
              )
            })}
          </div>
        ) : null}

        {!inStock ? (
          <span className="font-sans text-caption tracking-body text-primary/70">Нет в наличии</span>
        ) : selected && !selected.inStock ? (
          <span className="font-sans text-caption tracking-body text-primary/70">
            {selected.name} — нет в наличии
          </span>
        ) : null}
      </div>
    </article>
  )
}
