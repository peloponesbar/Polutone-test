'use client'

import { useState } from 'react'

import { imagesForColor } from '@/lib/catalog/images'
import { colorsOf, defaultColor, type PickerVariant } from '@/lib/catalog/variants'

import type { ImageData } from '../MediaImage'
import { ProductGallery } from './ProductGallery'
import { VariantPicker } from './VariantPicker'

type Props = {
  productId: number
  /** Color requested in the URL (?color=), used when the product has it. */
  requestedColor?: string | null
  images: ImageData[]
  variants: PickerVariant[]
  price: number
  oldPrice: number | null
  hasSizeChart: boolean
  modelNote?: string | null
  /** Title, category label and description (server-rendered). */
  heading: React.ReactNode
  /** Accordion with composition, sizes, delivery… (server-rendered). */
  info: React.ReactNode
}

/** Gallery + buy panel sharing the chosen color, so the photos show that color. */
export function ProductView({ productId, requestedColor, images, variants, heading, info, ...picker }: Props) {
  const [color, setColor] = useState<string | null>(() =>
    requestedColor && colorsOf(variants).includes(requestedColor) ? requestedColor : defaultColor(variants),
  )

  return (
    <div className="grid grid-cols-1 items-start gap-10 pt-6 md:grid-cols-12 md:gap-x-6">
      <div className="md:col-span-7">
        <ProductGallery images={imagesForColor(images, color)} seed={productId} />
      </div>

      <div className="flex flex-col gap-6 md:sticky md:top-[132px] md:col-span-4 md:col-start-9">
        {heading}
        <VariantPicker variants={variants} color={color} onColorChange={setColor} {...picker} />
        {info}
      </div>
    </div>
  )
}
