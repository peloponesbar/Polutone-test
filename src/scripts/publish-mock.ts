// Usage: npm run seed:mock — syncs the fictional catalog and publishes it (local development only).
import config from '@payload-config'
import { getPayload } from 'payload'

import { MockCatalogSource } from '../lib/catalog/source'
import { syncCatalog } from '../lib/catalog/sync'

if (process.env.NODE_ENV === 'production') {
  console.error('seed:mock is for local development only.')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  const report = await syncCatalog(payload, new MockCatalogSource())
  const published = await payload.update({
    collection: 'products',
    where: { published: { equals: false } },
    data: { published: true },
  })
  // Category tab order from mockup/catalog.html (in production it is set in the admin).
  const order = ['Верхняя одежда', 'Жакеты', 'Рубашки', 'Трикотаж', 'Брюки', 'Аксессуары']
  for (const [index, name] of order.entries()) {
    await payload.update({
      collection: 'categories',
      where: { name: { equals: name } },
      data: { order: (index + 1) * 10 },
    })
  }
  payload.logger.info({ msg: 'Mock catalog ready', ...report, published: published.docs.length })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Mock catalog seed failed' })
  process.exit(1)
}
