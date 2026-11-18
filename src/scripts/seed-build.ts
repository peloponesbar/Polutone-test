// Runs during the Vercel build (see `vercel-build`), after migrations.
// Fills a TEST deployment with draft «Информация» pages and the fictional catalog —
// only when SEED_TEST_DATA=true. Safe to repeat: nothing is duplicated or overwritten.
import config from '@payload-config'
import { getPayload } from 'payload'

import { seedInfoPages, seedTestCatalog } from '../lib/seed'

if (process.env.SEED_TEST_DATA !== 'true') {
  console.log('SEED_TEST_DATA is not "true" — skipping test data.')
  process.exit(0)
}

const payload = await getPayload({ config })
try {
  const info = await seedInfoPages(payload)
  const catalog = await seedTestCatalog(payload)
  payload.logger.info({ msg: 'Test data ready', infoPagesCreated: info.created, ...catalog })
  process.exit(0)
} catch (error) {
  payload.logger.error({ err: error, msg: 'Test data seed failed' })
  process.exit(1)
}
