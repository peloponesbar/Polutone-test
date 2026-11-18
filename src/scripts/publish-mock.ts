// Usage: npm run seed:mock — LOCAL DEVELOPMENT ONLY.
// Syncs the test catalog, publishes it, and removes leftovers of earlier test catalogs.
import config from '@payload-config'
import { getPayload } from 'payload'

import { resetLocalTestCatalog } from '../lib/seed'

if (process.env.NODE_ENV === 'production') {
  console.error('seed:mock is for local development only.')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  payload.logger.info({ msg: 'Mock catalog ready', ...(await resetLocalTestCatalog(payload)) })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Mock catalog seed failed' })
  process.exit(1)
}
