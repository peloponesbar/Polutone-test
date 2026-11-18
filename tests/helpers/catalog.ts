import { getPayload } from 'payload'

import { MockCatalogSource } from '../../src/lib/catalog/source.js'
import { syncCatalog } from '../../src/lib/catalog/sync.js'
import config from '../../src/payload.config.js'

/** Syncs the fictional catalog and publishes every product (e2e runs against the dev database). */
export async function seedPublishedCatalog(): Promise<void> {
  const payload = await getPayload({ config })
  await syncCatalog(payload, new MockCatalogSource())
  await payload.update({
    collection: 'products',
    where: { published: { equals: false } },
    data: { published: true },
  })
}
