// Usage: npm run seed:mock — LOCAL DEVELOPMENT ONLY.
// Syncs the test catalog, publishes it, and removes leftovers of earlier test catalogs.
import config from '@payload-config'
import { getPayload } from 'payload'

import { MockCatalogSource } from '../lib/catalog/source'
import { syncCatalog } from '../lib/catalog/sync'

if (process.env.NODE_ENV === 'production') {
  console.error('seed:mock is for local development only.')
  process.exit(1)
}

/** Category tab order (in production it is set in the admin). */
const CATEGORY_ORDER = ['Худи', 'Футболки', 'Брюки']

const payload = await getPayload({ config })
try {
  const report = await syncCatalog(payload, new MockCatalogSource())

  // Test data only: drop products that left the test catalog, then empty categories.
  const removed = await payload.delete({ collection: 'products', where: { inSource: { equals: false } } })
  const products = await payload.find({ collection: 'products', limit: 0, depth: 0, select: { category: true } })
  const used = products.docs.map((p) => p.category).filter((id): id is number => typeof id === 'number')
  await payload.delete({ collection: 'categories', where: { id: { not_in: used } } })

  const published = await payload.update({
    collection: 'products',
    where: { published: { equals: false } },
    data: { published: true },
  })
  for (const [index, name] of CATEGORY_ORDER.entries()) {
    await payload.update({
      collection: 'categories',
      where: { name: { equals: name } },
      data: { order: (index + 1) * 10 },
    })
  }

  payload.logger.info({
    msg: 'Mock catalog ready',
    ...report,
    published: published.docs.length,
    removedOld: removed.docs.length,
  })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Mock catalog seed failed' })
  process.exit(1)
}
