// Usage: npm run sync — pulls the catalog from CATALOG_SOURCE into the database.
import config from '@payload-config'
import { getPayload } from 'payload'

import { getCatalogSource } from '../lib/catalog/source'
import { syncCatalog } from '../lib/catalog/sync'

const payload = await getPayload({ config })
try {
  const report = await syncCatalog(payload, getCatalogSource(process.env))
  payload.logger.info({ msg: 'Catalog sync finished', ...report })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Catalog sync failed' })
  process.exit(1)
}
