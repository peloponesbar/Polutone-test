import config from '@payload-config'
import { getPayload, type Sort, type Where } from 'payload'

import { PUBLIC_PRODUCTS } from '@/collections/Products'
import type { Category, Product } from '@/payload-types'

export const SORT_OPTIONS = [
  { value: 'new', label: 'Сначала новые', sort: '-sourceUpdatedAt' },
  { value: 'price-asc', label: 'Сначала дешевле', sort: 'price' },
  { value: 'price-desc', label: 'Сначала дороже', sort: '-price' },
] as const satisfies readonly { value: string; label: string; sort: Sort }[]

export type SortValue = (typeof SORT_OPTIONS)[number]['value']

export function parseSort(value: string | undefined): SortValue {
  return SORT_OPTIONS.find((o) => o.value === value)?.value ?? 'new'
}

const payload = () => getPayload({ config })

/** Categories that have at least one visible product, in admin-defined order. */
export async function listCategories(): Promise<Category[]> {
  const p = await payload()
  const [categories, products] = await Promise.all([
    p.find({ collection: 'categories', sort: ['order', 'name'], limit: 100, depth: 0 }),
    p.find({ collection: 'products', where: PUBLIC_PRODUCTS, limit: 0, depth: 0, select: { category: true } }),
  ])
  const used = new Set(products.docs.map((d) => d.category))
  return categories.docs.filter((c) => used.has(c.id))
}

export async function listProducts(options: { categorySlug?: string; sort: SortValue }) {
  const p = await payload()
  const conditions: Where[] = [PUBLIC_PRODUCTS]

  if (options.categorySlug) {
    conditions.push({ 'category.slug': { equals: options.categorySlug } })
  }

  const sort = SORT_OPTIONS.find((o) => o.value === options.sort)!.sort
  const result = await p.find({
    collection: 'products',
    where: { and: conditions },
    // In-stock items first, then the chosen order.
    sort: ['-inStock', sort],
    limit: 100,
    depth: 1,
  })
  return result.docs
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const p = await payload()
  const result = await p.find({
    collection: 'products',
    where: { and: [PUBLIC_PRODUCTS, { slug: { equals: slug } }] },
    limit: 1,
    depth: 2,
  })
  return result.docs[0] ?? null
}

/** Up to `limit` other visible products: same category first, then the rest. */
export async function listRelated(product: Product, limit = 4): Promise<Product[]> {
  const p = await payload()
  const categoryId = typeof product.category === 'object' ? product.category?.id : product.category
  const others = await p.find({
    collection: 'products',
    where: { and: [PUBLIC_PRODUCTS, { id: { not_equals: product.id } }] },
    sort: ['-inStock', '-sourceUpdatedAt'],
    limit: 50,
    depth: 1,
  })
  const sameCategory = (d: Product) =>
    (typeof d.category === 'object' ? d.category?.id : d.category) === categoryId
  return [...others.docs.filter(sameCategory), ...others.docs.filter((d) => !sameCategory(d))].slice(
    0,
    limit,
  )
}
