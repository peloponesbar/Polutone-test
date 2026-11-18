import type { SourceProduct, SourceVariant } from './types'

/**
 * Subset of the MoySklad JSON API 1.2 assortment format the site relies on.
 * The mock source returns data in this shape, so the same mapping code
 * will later run on real API responses.
 */
export type MsPrice = { value: number; priceType: { name: string } }
export type MsAttribute = { name: string; value: string }
export type MsMeta = { href: string }

export type MsProduct = {
  id: string
  name: string
  article: string
  /** Folder path, e.g. "Одежда/Жакеты" — the last segment is the category. */
  pathName: string
  updated: string
  salePrices: MsPrice[]
  attributes?: MsAttribute[]
}

export type MsVariant = {
  id: string
  product: { meta: MsMeta }
  characteristics: MsAttribute[]
  /** Empty or zero price means "inherit the product price". */
  salePrices?: MsPrice[]
  /** Available quantity (stock minus reserve), as returned by /entity/assortment. */
  quantity: number
}

export type MsAssortment = { products: MsProduct[]; variants: MsVariant[] }

export const PRICE_TYPE_SALE = 'Цена продажи'
export const PRICE_TYPE_OLD = 'Старая цена'
export const ATTR_COMPOSITION = 'Состав'
export const ATTR_CARE = 'Уход'
export const ATTR_MEASUREMENTS = 'Обмеры'
export const CHAR_SIZE = 'Размер'
export const CHAR_COLOR = 'Цвет'

/** MoySklad stores money in kopecks. */
export function kopecksToRubles(value: number): number {
  return Math.round(value) / 100
}

function priceOf(prices: MsPrice[] | undefined, type: string): number | null {
  const price = prices?.find((p) => p.priceType.name === type)
  return price && price.value > 0 ? kopecksToRubles(price.value) : null
}

function attribute(list: MsAttribute[] | undefined, name: string): string {
  return list?.find((a) => a.name === name)?.value?.trim() ?? ''
}

/** Extracts the entity id from a MoySklad meta href (".../entity/product/<id>"). */
export function idFromHref(href: string): string {
  const id = href.split('?')[0].split('/').filter(Boolean).pop()
  if (!id) throw new Error(`Cannot read entity id from href: ${href}`)
  return id
}

/** Converts MoySklad "2026-11-01 10:00:00.000" (Moscow time) to ISO. */
export function msDateToIso(value: string): string {
  const date = new Date(`${value.replace(' ', 'T')}+03:00`)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid MoySklad date: ${value}`)
  return date.toISOString()
}

function toVariant(variant: MsVariant, productPrice: number): SourceVariant {
  return {
    externalId: variant.id,
    size: attribute(variant.characteristics, CHAR_SIZE),
    color: attribute(variant.characteristics, CHAR_COLOR),
    price: priceOf(variant.salePrices, PRICE_TYPE_SALE) ?? productPrice,
    available: Math.max(0, Math.floor(variant.quantity)),
  }
}

/**
 * Maps a MoySklad assortment to site products. Products without a sale price
 * or without variants can't be sold, so they are skipped and reported.
 */
export function normalizeAssortment(data: MsAssortment): {
  products: SourceProduct[]
  skipped: { id: string; name: string; reason: string }[]
} {
  const variantsByProduct = new Map<string, MsVariant[]>()
  for (const variant of data.variants) {
    const productId = idFromHref(variant.product.meta.href)
    variantsByProduct.set(productId, [...(variantsByProduct.get(productId) ?? []), variant])
  }

  const products: SourceProduct[] = []
  const skipped: { id: string; name: string; reason: string }[] = []

  for (const product of data.products) {
    const basePrice = priceOf(product.salePrices, PRICE_TYPE_SALE)
    const rawVariants = variantsByProduct.get(product.id) ?? []

    if (basePrice === null) {
      skipped.push({ id: product.id, name: product.name, reason: 'no sale price' })
      continue
    }
    if (rawVariants.length === 0) {
      skipped.push({ id: product.id, name: product.name, reason: 'no variants' })
      continue
    }

    const variants = rawVariants.map((v) => toVariant(v, basePrice))
    const price = Math.min(...variants.map((v) => v.price))
    const oldPrice = priceOf(product.salePrices, PRICE_TYPE_OLD)

    products.push({
      externalId: product.id,
      article: product.article,
      name: product.name.trim(),
      category: product.pathName.split('/').filter(Boolean).pop() ?? '',
      price,
      oldPrice: oldPrice !== null && oldPrice > price ? oldPrice : null,
      composition: attribute(product.attributes, ATTR_COMPOSITION),
      care: attribute(product.attributes, ATTR_CARE),
      measurements: attribute(product.attributes, ATTR_MEASUREMENTS),
      updatedAt: msDateToIso(product.updated),
      variants,
    })
  }

  return { products, skipped }
}
