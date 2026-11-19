import type { Payload } from 'payload'

import { MockCatalogSource } from './catalog/source'
import { syncCatalog } from './catalog/sync'
import { INFO_PAGE_DEFAULTS } from './info-defaults'

/** Category tab order for the test catalog (in production it is set in the admin). */
const TEST_CATEGORY_ORDER = ['Худи', 'Футболки', 'Брюки']

/** Creates missing «Информация» pages with draft texts; existing pages are never changed. */
export async function seedInfoPages(payload: Payload): Promise<{ created: number }> {
  let created = 0
  for (const page of INFO_PAGE_DEFAULTS) {
    const exists = await payload.count({ collection: 'info-pages', where: { slug: { equals: page.slug } } })
    if (exists.totalDocs > 0) continue
    await payload.create({ collection: 'info-pages', data: { ...page, _status: 'published' } })
    created += 1
  }
  return { created }
}

async function orderTestCategories(payload: Payload) {
  for (const [index, name] of TEST_CATEGORY_ORDER.entries()) {
    await payload.update({ collection: 'categories', where: { name: { equals: name } }, data: { order: (index + 1) * 10 } })
  }
}

/**
 * Test catalog for a deployed test site: syncs the mock source. Publishes and orders
 * categories only on the very first run (empty catalog), so later builds never undo
 * what was changed in the admin (unpublished products, category order).
 */
export async function seedTestCatalog(payload: Payload) {
  const before = await payload.count({ collection: 'products' })
  const report = await syncCatalog(payload, new MockCatalogSource())
  const firstRun = before.totalDocs === 0
  if (firstRun) {
    await publishDraftProducts(payload)
    await orderTestCategories(payload)
  }
  return { ...report, firstRun }
}

/**
 * Local development reset: syncs the mock source, removes leftovers of earlier test
 * catalogs, publishes everything and restores the test category order.
 */
export async function resetLocalTestCatalog(payload: Payload) {
  const report = await syncCatalog(payload, new MockCatalogSource())

  const removed = await payload.delete({ collection: 'products', where: { inSource: { equals: false } } })
  const products = await payload.find({ collection: 'products', limit: 0, depth: 0, select: { category: true } })
  const used = products.docs.map((p) => p.category).filter((id): id is number => typeof id === 'number')
  await payload.delete({ collection: 'categories', where: { id: { not_in: used } } })

  const published = await publishDraftProducts(payload)
  await orderTestCategories(payload)
  return { ...report, published, removedOld: removed.docs.length }
}

/** Publishes every product that is still an unpublished draft (test catalogs only). */
export async function publishDraftProducts(payload: Payload): Promise<number> {
  const result = await payload.update({
    collection: 'products',
    where: { _status: { equals: 'draft' } },
    data: { _status: 'published' },
  })
  return result.docs.length
}
