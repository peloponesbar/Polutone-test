import { randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'

import type { Product } from '../../payload-types'
import { slugify } from '../slug'
import type { CatalogSource, SourceProduct } from './types'

/** Marks writes made by catalog sync — the only writer of source-owned product fields. */
export const CATALOG_SYNC_CONTEXT = 'catalogSync'

export type SyncReport = {
  source: string
  created: number
  updated: number
  /** Products that disappeared from the source and were hidden. */
  hidden: number
  categoriesCreated: number
}

/** Fields owned by the source. Presentation fields and publication status are never touched. */
function commerceData(product: SourceProduct, categoryId: number | null) {
  return {
    title: product.name,
    article: product.article,
    category: categoryId,
    price: product.price,
    oldPrice: product.oldPrice,
    inStock: product.variants.some((v) => v.available > 0),
    composition: product.composition,
    care: product.care,
    measurements: product.measurements,
    sourceUpdatedAt: product.updatedAt,
    externalId: product.externalId,
    variants: product.variants.map((v) => ({ ...v })),
    inSource: true,
    syncedAt: new Date().toISOString(),
  }
}

async function ensureCategories(payload: Payload, names: string[]) {
  const ids = new Map<string, number>()
  let created = 0

  for (const name of [...new Set(names.filter(Boolean))]) {
    const existing = await payload.find({
      collection: 'categories',
      where: { name: { equals: name } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      ids.set(name, existing.docs[0].id)
      continue
    }
    const doc = await payload.create({
      collection: 'categories',
      data: { name, slug: slugify(name) },
    })
    ids.set(name, doc.id)
    created += 1
  }
  return { ids, created }
}

/** Slug from the name; on collision the article is appended, so URLs stay unique and stable. */
async function uniqueSlug(payload: Payload, product: SourceProduct): Promise<string> {
  const base = slugify(product.name) || slugify(product.article)
  const taken = await payload.count({ collection: 'products', where: { slug: { equals: base } } })
  return taken.totalDocs === 0 ? base : `${base}-${slugify(product.article)}`
}

/**
 * Brings the site's products in line with the catalog source:
 * new products are created as unpublished drafts, existing ones get fresh commerce data,
 * and products missing from the source are hidden (never deleted — photos and blocks stay).
 */
export async function syncCatalog(payload: Payload, source: CatalogSource): Promise<SyncReport> {
  const products = await source.listProducts()
  const { ids: categoryIds, created: categoriesCreated } = await ensureCategories(
    payload,
    products.map((p) => p.category),
  )

  let created = 0
  let updated = 0

  for (const product of products) {
    const data = commerceData(product, categoryIds.get(product.category) ?? null)
    const existing = await payload.find({
      collection: 'products',
      where: { externalId: { equals: product.externalId } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs[0]) {
      await updateSourceData(payload, existing.docs[0].id, data)
      updated += 1
    } else {
      await payload.create({
        collection: 'products',
        data: { ...data, slug: await uniqueSlug(payload, product), _status: 'draft' },
        draft: true,
        context: { [CATALOG_SYNC_CONTEXT]: true },
      })
      created += 1
    }
  }

  const sourceIds = products.map((p) => p.externalId)
  const gone = await payload.find({
    collection: 'products',
    where: {
      and: [{ inSource: { equals: true } }, { externalId: { not_in: sourceIds } }],
    },
    limit: 0,
    depth: 0,
    select: {},
  })
  for (const doc of gone.docs) {
    await updateSourceData(payload, doc.id, { inSource: false })
  }

  return {
    source: source.name,
    created,
    updated,
    hidden: gone.docs.length,
    categoriesCreated,
  }
}

/**
 * Writes source-owned fields without changing what is published or pending.
 * A plain update would rebuild the product from its latest version — so a pending
 * admin draft would either get published by the sync or hide the product.
 */
export async function updateSourceData(
  payload: Payload,
  id: number,
  data: Partial<Product>,
  /** Pass to run inside a transaction (checkout reserving stock). */
  req?: PayloadRequest,
) {
  const context = { [CATALOG_SYNC_CONTEXT]: true }
  const [live, latest] = await Promise.all([
    payload.findByID({ collection: 'products', id, depth: 0, draft: false, req }),
    payload.findByID({ collection: 'products', id, depth: 0, draft: true, req }),
  ])

  if (live._status === 'published' && latest._status === 'draft') {
    // Published product with a pending draft: refresh both, publish neither.
    // A direct row write skips Payload's hooks, so array rows need their ids here.
    const variants = data.variants?.map((v) => ({ ...v, id: v.id ?? randomUUID() }))
    await payload.db.updateOne({ collection: 'products', id, data: variants ? { ...data, variants } : data, req })
    await payload.update({ collection: 'products', id, data, draft: true, context, req })
    return
  }
  await payload.update({ collection: 'products', id, data: { ...data, _status: live._status ?? 'draft' }, context, req })
}
